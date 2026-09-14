import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-alert',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block' },
  template: `
    <div
      role="alert"
      aria-live="polite"
      class="text-sm rounded-xl px-4 py-3 border"
      [ngClass]="toneClasses"
    >
      <ng-content></ng-content>
    </div>
  `,
})
export class UiAlertComponent {
  @Input() tone: 'error' | 'success' | 'info' = 'error';

  get toneClasses(): string {
    switch (this.tone) {
      case 'success':
        return 'text-success bg-success-bg border-success-border';
      case 'info':
        return 'text-text-muted bg-surface-subtle border-border-subtle';
      default:
        return 'text-danger bg-danger-bg border-danger-border';
    }
  }
}
