import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import {
  AssistantService,
  MAX_MESSAGE_LENGTH,
  SUGGESTIONS,
} from '../../services/assistant.service';
import { AssistantActionCardComponent } from './assistant-action-card.component';
import { AssistantProductCardComponent } from './assistant-product-card.component';

@Component({
  selector: 'app-assistant-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, AssistantActionCardComponent, AssistantProductCardComponent],
  template: `
    <section
      id="assistant-panel"
      role="dialog"
      aria-labelledby="assistant-title"
      class="fixed inset-0 z-[60] flex flex-col border-border-subtle bg-surface text-text-main shadow-2xl lg:left-auto lg:w-[400px] lg:border-l"
    >
      <header class="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <h2 id="assistant-title" class="m-0 flex-1 font-display text-lg font-semibold">
          Asistente de compras
        </h2>
        <button
          *ngIf="auth.isLoggedIn() && !svc.isEmpty()"
          id="assistant-new"
          type="button"
          class="rounded-lg border border-border-medium px-2.5 py-1 text-xs font-semibold text-text-main transition hover:bg-surface-subtle"
          (click)="newConversation()"
        >
          Nueva conversación
        </button>
        <button
          id="assistant-close"
          type="button"
          class="rounded-lg p-1.5 text-text-muted transition hover:bg-surface-subtle hover:text-text-main"
          aria-label="Cerrar asistente"
          (click)="close.emit()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <!-- Guest: the assistant needs a session -->
      <div *ngIf="!auth.isLoggedIn()" id="assistant-guest" class="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p class="m-0 text-sm text-text-muted">
          Inicia sesión para conversar con el asistente: busca productos, arma tu carrito y haz tus pedidos con tu confirmación.
        </p>
        <a
          id="assistant-login-link"
          [routerLink]="['/auth/login']"
          [queryParams]="{ returnUrl: router.url }"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-primary-hover"
          (click)="close.emit()"
        >
          Iniciar sesión
        </a>
      </div>

      <!-- Privacy notice, first time only -->
      <div
        *ngIf="auth.isLoggedIn() && !svc.noticeAccepted()"
        id="assistant-notice"
        class="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <p class="m-0 text-sm text-text-main">
          Tus mensajes se envían a OpenAI para generar las respuestas del asistente.
        </p>
        <button
          id="assistant-notice-accept"
          type="button"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
          (click)="acceptNotice()"
        >
          Entendido
        </button>
      </div>

      <!-- Conversation -->
      <ng-container *ngIf="auth.isLoggedIn() && svc.noticeAccepted()">
        <div #list id="assistant-messages" class="flex flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
          <div *ngIf="svc.isEmpty()" id="assistant-empty" class="flex flex-col gap-3">
            <p class="m-0 text-sm text-text-muted">
              ¡Hola! Puedo ayudarte a buscar productos y a armar tu carrito. Prueba con alguna de estas ideas:
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                *ngFor="let s of suggestions; let i = index"
                type="button"
                [id]="'assistant-chip-' + i"
                class="rounded-full border border-border-medium bg-surface-elevated px-3 py-1.5 text-left text-xs font-medium text-text-main transition hover:border-primary disabled:opacity-60"
                [disabled]="svc.sending()"
                (click)="svc.send(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <ng-container *ngFor="let e of svc.entries(); let i = index">
            <div *ngIf="e.kind === 'user'" class="flex justify-end">
              <p class="m-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white" data-role="user">
                {{ e.text }}
              </p>
            </div>

            <div *ngIf="e.kind === 'assistant'" class="flex flex-col gap-2" data-role="assistant">
              <p
                *ngIf="e.text"
                class="m-0 max-w-[85%] self-start whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-surface-subtle px-3 py-2 text-sm text-text-main"
              >
                {{ e.text }}
              </p>
              <app-assistant-product-card
                *ngFor="let p of e.products"
                [product]="p"
                (opened)="onProductOpened()"
              ></app-assistant-product-card>
              <app-assistant-action-card
                *ngFor="let a of e.actions"
                [action]="a"
                (confirm)="svc.confirm($event)"
                (reject)="svc.reject($event)"
                (expired)="svc.markExpired($event)"
              ></app-assistant-action-card>
            </div>

            <div *ngIf="e.kind === 'event'" class="rounded-lg bg-secondary-light px-3 py-2 text-xs text-text-main" data-role="event">
              {{ e.text }}
              <a *ngIf="e.link" [routerLink]="e.link.url" class="ml-1 font-semibold text-primary underline" id="assistant-event-link" (click)="onProductOpened()">
                {{ e.link.label }}
              </a>
            </div>

            <div
              *ngIf="e.kind === 'error'"
              class="flex flex-col gap-2 rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger"
              role="alert"
              data-role="error"
            >
              <span class="assistant-error-text">{{ e.text }}</span>
              <button
                *ngIf="e.retryable && i === svc.entries().length - 1"
                id="assistant-retry"
                type="button"
                class="self-start rounded-lg border border-danger-border bg-surface px-2.5 py-1 text-xs font-semibold text-danger transition hover:bg-danger-bg"
                [disabled]="svc.sending()"
                (click)="svc.retry()"
              >
                Reintentar
              </button>
            </div>
          </ng-container>

          <div *ngIf="svc.sending()" id="assistant-typing" class="flex items-center gap-1 self-start rounded-2xl bg-surface-subtle px-3 py-2" aria-label="El asistente está escribiendo" role="status">
            <span class="assistant-dot"></span><span class="assistant-dot"></span><span class="assistant-dot"></span>
          </div>
        </div>

        <form class="border-t border-border-subtle p-3" (submit)="submit($event)">
          <div class="flex items-end gap-2">
            <textarea
              #input
              id="assistant-input"
              rows="2"
              class="max-h-32 min-h-[44px] flex-1 resize-none rounded-lg border border-border-medium bg-surface px-3 py-2 text-sm text-text-main outline-none focus:border-primary disabled:opacity-60"
              placeholder="Escribe tu mensaje…"
              aria-label="Mensaje para el asistente"
              [value]="draft()"
              [disabled]="svc.sending()"
              (input)="draft.set($any($event.target).value)"
              (keydown.enter)="onEnter($event)"
            ></textarea>
            <button
              id="assistant-send"
              type="submit"
              class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="!canSend()"
            >
              Enviar
            </button>
          </div>
          <p
            id="assistant-counter"
            class="m-0 mt-1 text-right text-xs"
            [ngClass]="draft().length > max ? 'font-semibold text-danger' : 'text-text-subtle'"
          >
            {{ draft().length }}/{{ max }}
          </p>
        </form>
      </ng-container>

      <p id="assistant-privacy-line" class="m-0 border-t border-border-subtle px-4 py-2 text-center text-[11px] text-text-subtle">
        Los mensajes se envían a OpenAI para generar las respuestas.
      </p>
    </section>
  `,
  styles: [
    `
      .assistant-dot {
        width: 6px;
        height: 6px;
        border-radius: 9999px;
        background: var(--color-text-subtle);
        animation: assistant-bounce 1s infinite ease-in-out;
      }
      .assistant-dot:nth-child(2) { animation-delay: 0.15s; }
      .assistant-dot:nth-child(3) { animation-delay: 0.3s; }
      @keyframes assistant-bounce {
        0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
        40% { opacity: 1; transform: translateY(-3px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .assistant-dot { animation: none; }
      }
    `,
  ],
})
export class AssistantPanelComponent implements OnInit, AfterViewInit {
  svc = inject(AssistantService);
  auth = inject(AuthService);
  router = inject(Router);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Esc or the X button: the launcher closes the panel and returns the focus to its button */
  @Output() close = new EventEmitter<void>();

  @ViewChild('list') list?: ElementRef<HTMLElement>;

  readonly suggestions = SUGGESTIONS;
  readonly max = MAX_MESSAGE_LENGTH;
  readonly draft = signal('');
  private wasSending = false;

  constructor() {
    effect(() => {
      // New content (or the typing indicator) scrolls to the bottom
      this.svc.entries();
      const sending = this.svc.sending();
      setTimeout(() => {
        const list = this.list?.nativeElement;
        if (list) list.scrollTop = list.scrollHeight;
        // A finished turn gives the text box back; other changes never steal the focus
        if (this.wasSending && !sending) this.focusPrimary();
        this.wasSending = sending;
      });
    });
  }

  ngOnInit(): void {
    this.svc.resume();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.focusPrimary());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  canSend(): boolean {
    const length = this.draft().trim().length;
    return length > 0 && length <= this.max && !this.svc.sending();
  }

  submit(event: Event): void {
    event.preventDefault();
    this.sendDraft();
  }

  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (e.shiftKey || e.isComposing) return; // Shift+Enter is a line break
    e.preventDefault();
    this.sendDraft();
  }

  private sendDraft(): void {
    if (!this.canSend()) return;
    this.svc.send(this.draft());
    this.draft.set('');
  }

  acceptNotice(): void {
    this.svc.acceptNotice();
    setTimeout(() => this.focusPrimary());
  }

  newConversation(): void {
    this.svc.newConversation();
    this.draft.set('');
    setTimeout(() => this.focusPrimary());
  }

  /** On a phone the panel covers the page, so following a link closes it */
  onProductOpened(): void {
    if (typeof window !== 'undefined' && window.matchMedia?.('(max-width: 1023px)').matches) {
      this.close.emit();
    }
  }

  /** Text box when there is one; otherwise the first thing the visitor has to act on */
  private focusPrimary(): void {
    const root = this.host.nativeElement;
    const target =
      root.querySelector<HTMLElement>('#assistant-input:not([disabled])') ??
      root.querySelector<HTMLElement>('#assistant-notice-accept') ??
      root.querySelector<HTMLElement>('#assistant-login-link');
    target?.focus();
  }
}
