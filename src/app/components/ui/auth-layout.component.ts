import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

export type AuthPhotoKey = 'verduras' | 'calle' | 'pan' | 'queso' | 'frutas' | 'aguayos';

interface AuthPhoto {
  src: string;
  alt: string;
  caption: string;
}

const PHOTOS: Record<AuthPhotoKey, AuthPhoto> = {
  verduras: {
    src: 'assets/landing/verduras-punata.jpg',
    alt: 'Puesto de verduras con zanahorias, vainitas y pimentones en el mercado de Punata',
    caption: 'Mercado de Punata, Cochabamba',
  },
  calle: {
    src: 'assets/landing/calle-cliza.jpg',
    alt: 'Una vendedora empuja una carretilla por una calle de mercado en Cliza',
    caption: 'Calle de mercado, Cliza',
  },
  pan: {
    src: 'assets/landing/pan-horno.jpg',
    alt: 'Pan recién salido del horno',
    caption: 'Pan de horno, La Paz',
  },
  queso: {
    src: 'assets/landing/queso.jpg',
    alt: 'Queso fresco y papayas en un mercado',
    caption: 'Queso fresco en un mercado',
  },
  frutas: {
    src: 'assets/landing/frutas-punata.jpg',
    alt: 'Cajones de frutas en un puesto del mercado de Punata',
    caption: 'Frutas en cajón, mercado de Punata',
  },
  aguayos: {
    src: 'assets/landing/aguayos.jpg',
    alt: 'Aguayos de colores apilados en un puesto',
    caption: 'Aguayos en un mercado de El Alto',
  },
};

@Component({
  selector: 'auth-layout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  host: { class: 'block' },
  styles: [
    `
      .band { display: flex; height: 28px; }
      .band i { flex: 1; }
      .band i:nth-child(1) { background: var(--color-accent-pink); flex: 3; }
      .band i:nth-child(2) { background: var(--color-secondary); flex: 1; }
      .band i:nth-child(3) { background: var(--color-accent-teal); flex: 2; }
      .band i:nth-child(4) { background: var(--color-accent-green); flex: 1; }
      .band i:nth-child(5) { background: var(--color-primary); flex: 4; }
      .band i:nth-child(6) { background: var(--color-text-main); flex: 1; }
      .band i:nth-child(7) { background: var(--color-secondary); flex: 2; }
      .band i:nth-child(8) { background: var(--color-accent-pink); flex: 1; }
      .photo { filter: saturate(1.08) sepia(0.1); }
      .panel { background: var(--color-bg-inverse); color: var(--color-text-on-inverse); }
    `,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-base text-text-main">
      <div class="band" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>

      <img [src]="current.src" [alt]="current.alt" class="photo lg:hidden w-full h-40 sm:h-56 object-cover" />

      <div class="flex-1 grid lg:grid-cols-2">
        <!-- Foto del mercado (escritorio) -->
        <aside class="hidden lg:flex relative flex-col justify-end overflow-hidden bg-inverse">
          <img
            [src]="current.src"
            [alt]="current.alt"
            class="photo absolute inset-0 h-full w-full object-cover"
          />
          <p class="absolute z-10 left-8 top-8 bg-[rgba(42,30,24,0.8)] px-3 py-1.5 text-sm text-inverse-text">
            {{ current.caption }}
          </p>
          <div class="panel relative z-10 p-8 xl:p-10">
            <p class="font-display text-3xl xl:text-4xl leading-tight font-bold max-w-md">
              {{ quote || 'El mercado de tu barrio, en tu celular.' }}
            </p>
            <p class="mt-3 text-base max-w-md text-inverse-muted">
              {{ subtitle || 'Compra lo fresco del día a los puestos de tu zona, o abre el tuyo.' }}
            </p>
          </div>
        </aside>

        <!-- Formulario -->
        <main class="flex flex-col min-h-0">
          <div class="flex items-center justify-between px-5 sm:px-8 lg:px-12 pt-5">
            <a routerLink="/" class="font-display text-2xl font-bold tracking-tight" aria-label="Mercadito, ir al inicio">
              Mercadito
            </a>
            <button
              type="button"
              (click)="theme.toggle()"
              class="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius)] text-text-main hover:bg-surface-subtle transition"
              [attr.aria-label]="theme.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
            >
              <svg *ngIf="!theme.isDark()" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
              </svg>
              <svg *ngIf="theme.isDark()" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
              </svg>
            </button>
          </div>

          <div class="flex-1 flex items-center px-5 sm:px-8 lg:px-12 py-10">
            <div class="w-full max-w-md mx-auto animate-slide-up">
              <ng-content></ng-content>
            </div>
          </div>

          <p class="px-5 sm:px-8 lg:px-12 pb-6 text-sm text-text-muted">
            <a routerLink="/" class="underline underline-offset-4 hover:text-text-main">Volver al inicio</a>
          </p>
        </main>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  theme = inject(ThemeService);

  @Input() quote = '';
  @Input() subtitle = '';
  @Input() photo: AuthPhotoKey = 'verduras';

  get current(): AuthPhoto {
    return PHOTOS[this.photo] ?? PHOTOS.verduras;
  }
}
