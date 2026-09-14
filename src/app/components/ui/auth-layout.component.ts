import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'auth-layout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  host: { class: 'block' },
  template: `
    <div class="min-h-screen bg-base flex">
      <!-- Brand panel (desktop) -->
      <aside
        class="hidden lg:flex lg:w-1/2 relative overflow-hidden
               flex-col justify-between p-10 xl:p-12 animate-fade-in"
      >
        <img
          [src]="panelImage"
          alt="Mercado tradicional boliviano con puestos de productos locales"
          class="absolute inset-0 h-full w-full object-cover"
        />
        <!-- Tint + readability gradient -->
        <div
          class="absolute inset-0 pointer-events-none"
          style="background:
            linear-gradient(160deg, rgba(58,42,34,0.55) 0%, rgba(95,119,69,0.72) 45%, rgba(58,42,34,0.85) 100%),
            linear-gradient(to top, rgba(28,22,19,0.75) 0%, transparent 55%);"
          aria-hidden="true"
        ></div>
        <div
          class="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay"
          style="background-image: url('https://www.transparenttextures.com/patterns/asfalt-dark.png')"
          aria-hidden="true"
        ></div>

        <a routerLink="/" class="relative z-10 flex items-center gap-3 text-white">
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6" aria-hidden="true">
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
            </svg>
          </span>
          <span class="text-xl font-semibold tracking-wide font-display">Mercadito</span>
        </a>
        <div class="relative z-10 animate-slide-up" style="animation-delay: 80ms">
          <blockquote class="text-white text-2xl xl:text-3xl font-display leading-snug mb-6 drop-shadow-sm">
            <ng-container *ngIf="quote; else defaultQuote">{{ quote }}</ng-container>
            <ng-template #defaultQuote>
              El mercado local,<br />en la palma de tu mano.
            </ng-template>
          </blockquote>
          <p class="text-white/85 text-sm max-w-sm">
            {{ subtitle || 'Conectamos productores y compradores de tu comunidad.' }}
          </p>
        </div>
        <p class="relative z-10 text-white/55 text-xs tracking-wide">Mercado Boliviano</p>
      </aside>

      <!-- Form panel -->
      <main class="flex-1 flex flex-col min-h-screen bg-base">
        <div class="flex items-center justify-between px-4 sm:px-6 pt-6 lg:pt-8">
          <a
            routerLink="/"
            class="lg:invisible flex items-center gap-2 text-text-main font-semibold"
          >
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4" aria-hidden="true">
                <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
              </svg>
            </span>
            Mercadito
          </a>
          <button
            type="button"
            (click)="theme.toggle()"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl
                   border border-border-subtle bg-surface text-text-muted
                   hover:text-text-main hover:border-border-medium transition"
            [attr.aria-label]="theme.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          >
            <svg *ngIf="!theme.isDark()" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
            <svg *ngIf="theme.isDark()" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          </button>
        </div>

        <div class="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <div class="w-full max-w-md animate-slide-up">
            <ng-content></ng-content>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class AuthLayoutComponent {
  theme = inject(ThemeService);

  @Input() quote = '';
  @Input() subtitle = '';

  /** Mercado tradicional — La Paz, Bolivia (Unsplash) */
  readonly panelImage =
    'https://images.unsplash.com/photo-1556685704-1985e999a0d4?auto=format&fit=crop&w=1600&q=80';
}
