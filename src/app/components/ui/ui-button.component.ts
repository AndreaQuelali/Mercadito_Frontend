import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  host: {
    class: 'block',
    '[class.w-full]': 'fullWidth',
  },
  template: `
    <button
      [type]="type"
      [disabled]="isInactive"
      [attr.aria-busy]="loading || null"
      class="inline-flex items-center justify-center gap-2 font-semibold transition
             focus-visible:outline-none"
      [ngClass]="classes"
    >
      <span
        *ngIf="loading"
        class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"
        aria-hidden="true"
      ></span>
      <ng-content></ng-content>
    </button>
  `,
})
export class UiButtonComponent {
  @Input() variant: 'primary' | 'ghost' = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth = false;
  @Input() loading = false;
  @Input() disabled = false;

  get isInactive(): boolean {
    return this.disabled || this.loading;
  }

  get classes(): string {
    const base = this.fullWidth ? 'w-full min-h-[52px] px-6' : 'min-h-[52px] px-6';
    if (this.isInactive) {
      return `${base} bg-surface-subtle text-text-subtle border border-border-subtle
              cursor-not-allowed shadow-none`;
    }
    if (this.variant === 'ghost') {
      return `${base} bg-transparent text-text-muted border border-border-medium
              hover:bg-surface-subtle hover:text-text-main`;
    }
    return `${base} bg-primary hover:bg-primary-hover text-on-primary border border-transparent`;
  }
}
