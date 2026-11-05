import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Estado vacío estándar. Tres variantes:
 * - first: todavía no hay nada, invita a empezar (lleva un botón).
 * - no-results: la búsqueda o el filtro no encuentra nada (ofrece limpiar o cambiar filtros).
 * - error: no se pudo cargar (ofrece reintentar).
 *
 * Las acciones se proyectan dentro del componente: <ui-empty ...><a class="ui-btn">...</a></ui-empty>
 */
export type UiEmptyVariant = 'first' | 'no-results' | 'error';
export type UiEmptyIcon = 'cart' | 'box' | 'orders' | 'store' | 'search' | 'users' | 'alert';

const DEFAULT_ICON: Record<UiEmptyVariant, UiEmptyIcon> = {
  first: 'box',
  'no-results': 'search',
  error: 'alert',
};

@Component({
  selector: 'ui-empty',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'block' },
  template: `
    <div class="ui-empty" [attr.role]="variant === 'error' ? 'alert' : null">
      <span class="ui-empty__ic" [ngClass]="'is-' + variant" aria-hidden="true" [ngSwitch]="resolvedIcon">
        <svg *ngSwitchCase="'cart'" viewBox="0 0 24 24"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6"/></svg>
        <svg *ngSwitchCase="'box'" viewBox="0 0 24 24"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></svg>
        <svg *ngSwitchCase="'orders'" viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 12h6M9 16h4"/></svg>
        <svg *ngSwitchCase="'store'" viewBox="0 0 24 24"><path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/></svg>
        <svg *ngSwitchCase="'search'" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <svg *ngSwitchCase="'users'" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c1.8.7 3 2.3 3.5 5.2"/></svg>
        <svg *ngSwitchCase="'alert'" viewBox="0 0 24 24"><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4M12 17.5v.01"/></svg>
      </span>
      <h2 class="ui-empty__title">{{ title }}</h2>
      <p *ngIf="text" class="ui-empty__text">{{ text }}</p>
      <div class="ui-empty__actions"><ng-content></ng-content></div>
    </div>
  `,
})
export class UiEmptyComponent {
  @Input() variant: UiEmptyVariant = 'first';
  @Input() icon?: UiEmptyIcon;
  @Input() title = '';
  @Input() text = '';

  get resolvedIcon(): UiEmptyIcon {
    return this.icon ?? DEFAULT_ICON[this.variant];
  }
}
