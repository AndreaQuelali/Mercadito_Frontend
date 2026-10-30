import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Logo de Mercadito: el toldo del puesto con los colores del aguayo, junto al nombre en Besley.
 * Los toldos y las frutas son de marca y no cambian entre temas; los postes y el mostrador toman
 * el color de la letra (currentColor).
 *
 * Tamaño: el logo se escala con el font-size del elemento que lo contiene (el toldo mide 1.75em).
 * `markOnly` muestra solo el toldo; `collapseOnSmall` oculta el nombre en pantallas de menos de 480px.
 */
@Component({
  selector: 'ui-logo',
  standalone: true,
  imports: [CommonModule],
  host: { class: 'inline-flex' },
  styles: [
    `
      .logo {
        display: inline-flex;
        align-items: center;
        gap: 0.35em;
        line-height: 1;
        color: inherit;
      }
      .logo__mark {
        width: 1.75em;
        height: 1.75em;
        flex: none;
      }
      .logo__word {
        font-family: 'Besley', Georgia, serif;
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      @media (max-width: 479px) {
        .logo.logo--short .logo__word {
          display: none;
        }
      }
    `,
  ],
  template: `
    <span class="logo" [class.logo--short]="collapseOnSmall">
      <svg class="logo__mark" viewBox="0 0 64 64" [attr.aria-hidden]="markOnly ? null : 'true'" [attr.role]="markOnly ? 'img' : null" [attr.aria-label]="markOnly ? 'Mercadito' : null">
        <polygon points="10,6 15.5,6 9.5,30 2,30" fill="#C83D68"/><circle cx="5.75" cy="30" r="3.75" fill="#C83D68"/>
        <polygon points="15.5,6 21,6 17,30 9.5,30" fill="#D9A441"/><circle cx="13.25" cy="30" r="3.75" fill="#D9A441"/>
        <polygon points="21,6 26.5,6 24.5,30 17,30" fill="#3E9C9A"/><circle cx="20.75" cy="30" r="3.75" fill="#3E9C9A"/>
        <polygon points="26.5,6 32,6 32,30 24.5,30" fill="#5F7745"/><circle cx="28.25" cy="30" r="3.75" fill="#5F7745"/>
        <polygon points="32,6 37.5,6 39.5,30 32,30" fill="#B3412C"/><circle cx="35.75" cy="30" r="3.75" fill="#B3412C"/>
        <polygon points="37.5,6 43,6 47,30 39.5,30" fill="#4A3328"/><circle cx="43.25" cy="30" r="3.75" fill="#4A3328"/>
        <polygon points="43,6 48.5,6 54.5,30 47,30" fill="#D9A441"/><circle cx="50.75" cy="30" r="3.75" fill="#D9A441"/>
        <polygon points="48.5,6 54,6 62,30 54.5,30" fill="#C83D68"/><circle cx="58.25" cy="30" r="3.75" fill="#C83D68"/>
        <rect x="7" y="34" width="3.5" height="26" fill="currentColor"/><rect x="53.5" y="34" width="3.5" height="26" fill="currentColor"/>
        <rect x="7" y="48" width="50" height="12" rx="2" fill="currentColor"/>
        <circle cx="20" cy="44.6" r="3.4" fill="#B3412C"/><circle cx="32" cy="44.6" r="3.4" fill="#D9A441"/><circle cx="44" cy="44.6" r="3.4" fill="#5F7745"/>
      </svg>
      <span *ngIf="!markOnly" class="logo__word">Mercadito</span>
    </span>
  `,
})
export class UiLogoComponent {
  @Input() markOnly = false;
  @Input() collapseOnSmall = false;
}
