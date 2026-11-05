import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { PendingActionView } from '../../services/assistant.service';

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** One proposed change: summary, Confirm / Reject, a countdown to its expiry, and its final state */
@Component({
  selector: 'app-assistant-action-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="action"
      [id]="'assistant-action-' + action.id"
      class="rounded-xl border bg-surface-elevated p-3 text-sm"
      [ngClass]="{
        'border-primary': action.state === 'pending' || action.state === 'confirming',
        'border-success-border': action.state === 'confirmed',
        'border-border-subtle': action.state === 'rejected' || action.state === 'expired',
        'border-danger-border': action.state === 'failed'
      }"
      [attr.data-state]="action.state"
    >
      <p class="m-0 font-medium text-text-main" [id]="'assistant-action-summary-' + action.id">
        {{ action.summary }}
      </p>

      <ng-container *ngIf="action.state === 'pending' || action.state === 'confirming'">
        <p class="mb-0 mt-1 text-xs text-text-muted" [id]="'assistant-action-timer-' + action.id">
          Vence en {{ remainingText() }}
        </p>
        <div class="mt-2 flex gap-2">
          <button
            type="button"
            [id]="'assistant-confirm-' + action.id"
            class="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="action.state === 'confirming'"
            (click)="confirm.emit(action.id)"
          >
            {{ action.state === 'confirming' ? 'Confirmando…' : 'Confirmar' }}
          </button>
          <button
            type="button"
            [id]="'assistant-reject-' + action.id"
            class="flex-1 rounded-lg border border-border-medium bg-surface px-3 py-1.5 text-sm font-semibold text-text-main transition hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-60"
            [disabled]="action.state === 'confirming'"
            (click)="reject.emit(action.id)"
          >
            Rechazar
          </button>
        </div>
      </ng-container>

      <p
        *ngIf="action.state === 'confirmed'"
        class="mb-0 mt-1 text-xs font-semibold text-success"
        [id]="'assistant-action-status-' + action.id"
      >
        Confirmada
      </p>
      <p
        *ngIf="action.state === 'rejected'"
        class="mb-0 mt-1 text-xs text-text-muted"
        [id]="'assistant-action-status-' + action.id"
      >
        Rechazada
      </p>
      <p
        *ngIf="action.state === 'expired' || action.state === 'failed'"
        class="mb-0 mt-1 text-xs"
        [ngClass]="action.state === 'failed' ? 'text-danger' : 'text-text-muted'"
        role="status"
        [id]="'assistant-action-status-' + action.id"
      >
        {{ action.error || (action.state === 'expired' ? 'Venció' : 'No se pudo completar') }}
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
