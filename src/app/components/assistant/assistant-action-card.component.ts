import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PendingActionView } from '../../services/assistant.service';

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * One proposed change. While it waits it is a card with Confirm / Reject and a countdown;
 * once it is resolved it shrinks to a discreet line with its outcome.
 */
@Component({
  selector: 'app-assistant-action-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="action" [id]="'assistant-action-' + action.id" [attr.data-state]="action.state">
      <!-- Pendiente de confirmar -->
      <div
        *ngIf="action.state === 'pending' || action.state === 'confirming'"
        class="flex flex-col gap-3 rounded-[var(--radius)] border border-border-subtle bg-surface-subtle p-3.5"
      >
        <div class="flex items-center justify-between gap-2 text-[13px] text-text-muted">
          <span class="inline-flex items-center gap-1.5 font-semibold text-text-main">
            <span class="h-2 w-2 rounded-full bg-secondary" aria-hidden="true"></span>Necesita tu confirmación
          </span>
          <span [id]="'assistant-action-timer-' + action.id">Vence en {{ remainingText() }}</span>
        </div>
        <p class="m-0 text-[15px] font-semibold leading-snug text-text-main" [id]="'assistant-action-summary-' + action.id">
          {{ action.summary }}
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            [id]="'assistant-confirm-' + action.id"
            class="ui-btn ui-btn-sm flex-1 !text-sm"
            [disabled]="action.state === 'confirming'"
            (click)="confirm.emit(action.id)"
          >
            {{ action.state === 'confirming' ? 'Confirmando…' : 'Confirmar' }}
          </button>
          <button
            type="button"
            [id]="'assistant-reject-' + action.id"
            class="ui-btn ui-btn-ghost ui-btn-sm flex-1 !text-sm"
            [disabled]="action.state === 'confirming'"
            (click)="reject.emit(action.id)"
          >
            Rechazar
          </button>
        </div>
      </div>

      <!-- Resultado: una línea discreta -->
      <p
        *ngIf="action.state === 'confirmed'"
        class="m-0 flex items-start gap-2 text-sm text-text-main"
        [id]="'assistant-action-status-' + action.id"
      >
        <svg viewBox="0 0 24 24" class="mt-0.5 h-[18px] w-[18px] flex-none text-accent-green" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></svg>
        <span><strong class="font-semibold">Confirmada:</strong> {{ action.summary }}</span>
      </p>
      <p
        *ngIf="action.state === 'rejected'"
        class="m-0 flex items-start gap-2 text-sm text-text-muted"
        [id]="'assistant-action-status-' + action.id"
      >
        <svg viewBox="0 0 24 24" class="mt-0.5 h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>
        <span><strong class="font-semibold">Rechazada:</strong> {{ action.summary }}</span>
      </p>
      <p
        *ngIf="action.state === 'expired' || action.state === 'failed'"
        class="m-0 flex items-start gap-2 text-sm"
        [ngClass]="action.state === 'failed' ? 'text-danger' : 'text-text-muted'"
        role="status"
        [id]="'assistant-action-status-' + action.id"
      >
        <svg *ngIf="action.state === 'failed'" viewBox="0 0 24 24" class="mt-0.5 h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5v.01" /></svg>
        <svg *ngIf="action.state === 'expired'" viewBox="0 0 24 24" class="mt-0.5 h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        <span><strong class="font-semibold">{{ action.summary }}:</strong> {{ action.error || (action.state === 'expired' ? 'Venció' : 'No se pudo completar') }}</span>
      </p>
    </div>
  `,
})
export class AssistantActionCardComponent implements OnInit, OnDestroy {
  @Input() action?: PendingActionView;
  @Output() confirm = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();
  /** The server decides the real expiry (404 on confirm); this only keeps the card honest */
  @Output() expired = new EventEmitter<string>();

  private now = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.timer = setInterval(() => {
      this.now.set(Date.now());
      if (this.action?.state === 'pending' && this.remainingMs() <= 0) this.expired.emit(this.action.id);
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  remainingMs(): number {
    return this.action ? new Date(this.action.expiresAt).getTime() - this.now() : 0;
  }

  remainingText(): string {
    return formatRemaining(this.remainingMs());
  }
}
