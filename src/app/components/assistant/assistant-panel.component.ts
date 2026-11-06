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
      class="fixed inset-0 z-[60] flex flex-col border-border-subtle bg-base text-text-main lg:left-auto lg:w-[400px] lg:border-l"
    >
      <!-- Franja de aguayo, fina -->
      <div class="flex h-1 flex-none" aria-hidden="true">
        <div class="flex-[3] bg-accent-pink"></div>
        <div class="flex-1 bg-secondary"></div>
        <div class="flex-[2] bg-accent-teal"></div>
        <div class="flex-1 bg-accent-green"></div>
        <div class="flex-[4] bg-primary"></div>
        <div class="flex-1" style="background: var(--color-aguayo-brown)"></div>
        <div class="flex-[2] bg-secondary"></div>
        <div class="flex-1 bg-accent-pink"></div>
      </div>

      <header class="flex flex-none items-center gap-2.5 py-2.5 pl-5 pr-3">
        <span class="grid h-8 w-8 flex-none place-items-center rounded-[var(--radius)] bg-primary text-[color:var(--color-text-on-primary)]" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>
        </span>
        <div class="min-w-0 flex-1 leading-tight">
          <h2 id="assistant-title" class="m-0 text-[16px] font-semibold">Asistente</h2>
          <span class="text-[13px] text-text-muted">Compras en Mercadito</span>
        </div>
        <button
          *ngIf="auth.isLoggedIn() && !svc.isEmpty()"
          id="assistant-new"
          type="button"
          class="grid h-11 w-11 place-items-center rounded-[var(--radius)] text-text-main transition hover:bg-surface-hover"
          aria-label="Nueva conversación"
          (click)="newConversation()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
        <button
          id="assistant-close"
          type="button"
          class="grid h-11 w-11 place-items-center rounded-[var(--radius)] text-text-main transition hover:bg-surface-hover"
          aria-label="Cerrar asistente"
          (click)="close.emit()"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <!-- Invitado: el asistente necesita una sesión -->
      <div *ngIf="!auth.isLoggedIn()" id="assistant-guest" class="flex flex-1 flex-col items-center justify-center gap-2.5 px-7 py-6 text-center">
        <svg viewBox="0 0 24 24" class="h-16 w-16 text-secondary" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" />
        </svg>
        <h3 class="ui-h2 mt-1 !text-2xl">Inicia sesión para usar el asistente</h3>
        <p class="m-0 max-w-[30ch] text-[15px] text-text-muted">
          Busca productos, arma tu carrito y haz tus pedidos con tu confirmación.
        </p>
        <a
          id="assistant-login-link"
          [routerLink]="['/auth/login']"
          [queryParams]="{ returnUrl: router.url }"
          class="ui-btn mt-2.5 !px-8"
          (click)="close.emit()"
        >
          Iniciar sesión
        </a>
        <a id="assistant-register-link" [routerLink]="['/auth/register']" class="ui-link inline-flex min-h-[44px] items-center" (click)="close.emit()">
          Crear cuenta
        </a>
      </div>

      <!-- Aviso de privacidad, la primera vez -->
      <div
        *ngIf="auth.isLoggedIn() && !svc.noticeAccepted()"
        id="assistant-notice"
        class="flex flex-1 flex-col items-center justify-center gap-2.5 px-7 py-6 text-center"
      >
        <svg viewBox="0 0 24 24" class="h-16 w-16 text-accent-teal" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.1 7.5 9.5 4.4-1.4 7.5-5.1 7.5-9.5V6L12 3Z" /><path d="m9 12 2.2 2.2L15.5 10" />
        </svg>
        <h3 class="ui-h2 mt-1 !text-2xl">Antes de empezar</h3>
        <p class="m-0 max-w-[30ch] text-[15px] text-text-muted">
          Tus mensajes se envían a OpenAI para generar las respuestas del asistente.
        </p>
        <button id="assistant-notice-accept" type="button" class="ui-btn mt-2.5 !px-8" (click)="acceptNotice()">
          Entendido
        </button>
      </div>

      <!-- Conversación -->
      <ng-container *ngIf="auth.isLoggedIn() && svc.noticeAccepted()">
        <div #list id="assistant-messages" class="flex flex-1 flex-col gap-[22px] overflow-y-auto px-5 pb-4 pt-2" aria-live="polite">
          <div *ngIf="svc.isEmpty()" id="assistant-empty" class="flex flex-col gap-[22px] pt-6">
            <div class="flex flex-col gap-2">
              <span class="grid h-11 w-11 place-items-center rounded-[var(--radius)] bg-primary text-[color:var(--color-text-on-primary)]" aria-hidden="true">
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
              </span>
              <h3 class="ui-h2 mt-2 !text-[28px]">¿Qué buscas hoy?</h3>
              <p class="m-0 max-w-[32ch] text-[15px] text-text-muted">Pregúntame por productos, por tu carrito o por tus pedidos.</p>
            </div>
            <div class="flex flex-col gap-2">
              <button
                *ngFor="let s of suggestions; let i = index"
                type="button"
                [id]="'assistant-chip-' + i"
                class="flex min-h-[52px] items-center justify-between gap-3 rounded-[var(--radius)] border border-border-subtle bg-surface-subtle px-4 text-left text-[15px] text-text-main transition hover:bg-surface-hover disabled:opacity-60"
                [disabled]="svc.sending()"
                (click)="svc.send(s)"
              >
                {{ s }}
                <svg viewBox="0 0 24 24" class="h-[18px] w-[18px] flex-none text-text-muted" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
              </button>
            </div>
          </div>

          <ng-container *ngFor="let e of svc.entries(); let i = index">
            <!-- Usuario: burbuja suave a la derecha -->
            <div *ngIf="e.kind === 'user'" class="flex justify-end">
              <p class="m-0 max-w-[80%] whitespace-pre-wrap break-words rounded-[var(--radius)] bg-surface-hover px-3.5 py-2.5 text-[15px]" data-role="user">{{ e.text }}</p>
            </div>

            <!-- Asistente: texto sin burbuja, con su avatar -->
            <div *ngIf="e.kind === 'assistant'" class="flex items-start gap-3" data-role="assistant">
              <span class="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-[var(--radius)] bg-primary text-[color:var(--color-text-on-primary)]" aria-hidden="true">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
              </span>
              <div class="flex min-w-0 flex-1 flex-col gap-3">
                <p *ngIf="e.text" class="m-0 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{{ e.text }}</p>
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
            </div>

            <!-- Resultado de una acción: una línea discreta, no una tarjeta -->
            <p *ngIf="e.kind === 'event'" class="m-0 flex items-start gap-2 pl-10 text-sm text-text-main" data-role="event">
              <svg *ngIf="e.link" viewBox="0 0 24 24" class="mt-0.5 h-[18px] w-[18px] flex-none text-accent-green" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></svg>
              <svg *ngIf="!e.link" viewBox="0 0 24 24" class="mt-0.5 h-[18px] w-[18px] flex-none text-text-muted" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></svg>
              <span>
                {{ e.text }}
                <a *ngIf="e.link" [routerLink]="e.link.url" class="ui-link ml-1" id="assistant-event-link" (click)="onProductOpened()">{{ e.link.label }}</a>
              </span>
            </p>

            <!-- Error -->
            <div *ngIf="e.kind === 'error'" class="flex items-start gap-3" role="alert" data-role="error">
              <span class="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-[var(--radius)] bg-primary text-[color:var(--color-text-on-primary)]" aria-hidden="true">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
              </span>
              <div class="flex min-w-0 flex-1 flex-col gap-2.5 rounded-[var(--radius)] border border-danger-border bg-danger-bg px-3.5 py-3">
                <p class="m-0 flex items-start gap-2 text-sm font-semibold text-danger">
                  <svg viewBox="0 0 24 24" class="mt-px h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5v.01" /></svg>
                  <span class="assistant-error-text">{{ e.text }}</span>
                </p>
                <button
                  *ngIf="e.retryable && i === svc.entries().length - 1"
                  id="assistant-retry"
                  type="button"
                  class="ui-btn ui-btn-ghost ui-btn-sm self-start !text-sm"
                  [disabled]="svc.sending()"
                  (click)="svc.retry()"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </ng-container>

          <div *ngIf="svc.sending()" id="assistant-typing" class="flex items-center gap-3" role="status" aria-label="El asistente está escribiendo">
            <span class="grid h-7 w-7 flex-none place-items-center rounded-[var(--radius)] bg-primary text-[color:var(--color-text-on-primary)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>
            </span>
            <span class="inline-flex items-center gap-[5px]" aria-hidden="true"><span class="assistant-dot"></span><span class="assistant-dot"></span><span class="assistant-dot"></span></span>
          </div>
        </div>

        <!-- Compositor -->
        <form class="flex-none px-4 pb-2" (submit)="submit($event)">
          <div
            class="flex flex-col gap-1 rounded-[var(--radius)] border-2 py-2.5 pl-3.5 pr-2.5 pb-2 transition-colors focus-within:border-primary"
            [ngClass]="svc.sending() ? 'border-border-subtle bg-surface-subtle' : 'border-border-medium bg-surface'"
          >
            <textarea
              #input
              id="assistant-input"
              rows="2"
              class="w-full resize-none border-0 bg-transparent py-1 text-[15px] leading-normal text-text-main outline-none placeholder:text-text-muted disabled:opacity-70"
              [placeholder]="svc.sending() ? 'Esperando la respuesta…' : 'Pregunta por un producto o pide agregarlo…'"
              aria-label="Mensaje para el asistente"
              [value]="draft()"
              [disabled]="svc.sending()"
              (input)="draft.set($any($event.target).value)"
              (keydown.enter)="onEnter($event)"
            ></textarea>
            <div class="flex items-center justify-between gap-2">
              <span class="text-[13px] text-text-muted">Enter envía · Shift+Enter, línea nueva</span>
              <div class="flex items-center gap-2.5">
                <span id="assistant-counter" class="text-[13px]" [ngClass]="draft().length > max ? 'font-semibold text-danger' : 'text-text-muted'">{{ draft().length }}/{{ max }}</span>
                <button
                  id="assistant-send"
                  type="submit"
                  aria-label="Enviar mensaje"
                  class="grid h-11 w-11 place-items-center rounded-[var(--radius)] bg-primary text-[color:var(--color-text-on-primary)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
                  [disabled]="!canSend()"
                >
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
              </div>
            </div>
          </div>
        </form>
      </ng-container>

      <p id="assistant-privacy-line" class="m-0 flex-none px-5 pb-3.5 pt-1 text-center text-[13px] text-text-muted">
        Tus mensajes se envían a OpenAI para generar las respuestas.
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
