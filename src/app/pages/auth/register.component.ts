import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen bg-base text-text-main flex flex-col lg:flex-row transition-colors duration-300">
    <!-- Left Decorative Brand Panel -->
    <aside class="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-to-br from-primary via-[#B04B2D] to-brand-700 dark:from-surface dark:via-surface-elevated dark:to-base relative overflow-hidden flex-col justify-between p-12 text-white border-r border-border-subtle/30">
      
      <!-- Cultural Pattern SVG Overlay -->
      <div class="absolute inset-0 opacity-10 pointer-events-none">
        <svg class="w-full h-full" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="aguayo-pattern-reg" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <circle cx="20" cy="20" r="3" fill="currentColor"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aguayo-pattern-reg)" />
        </svg>
      </div>

      <!-- Header / Logo -->
      <a routerLink="/" class="relative z-10 flex items-center gap-3 text-white group w-fit">
        <span class="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-md group-hover:scale-105 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6 text-white">
            <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
          </svg>
        </span>
        <span class="text-2xl font-display font-bold tracking-tight">Mercadito</span>
      </a>

      <!-- Center Quote & Features -->
      <div class="relative z-10 my-auto py-12">
        <span class="inline-block px-3 py-1 mb-6 text-xs font-semibold uppercase tracking-widest bg-white/15 backdrop-blur-md rounded-full border border-white/20">
          Únete Hoy
        </span>
        <blockquote class="text-3xl xl:text-4xl font-display font-bold leading-tight mb-6 text-white drop-shadow-sm">
          "Sé parte de la nueva red de comercio local y sostenible."
        </blockquote>
        <p class="text-white/80 text-base max-w-lg mb-8 leading-relaxed">
          Crea tu cuenta gratis en segundos para comprar productos autóctonos o publicar tu propio puesto digital.
        </p>

        <!-- Feature List -->
        <div class="space-y-3 max-w-md">
          <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
            <span class="text-xl">🛍️</span>
            <span class="text-sm font-medium text-white/95">Accede a ofertas exclusivas de vecinos y productores</span>
          </div>
          <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
            <span class="text-xl">🌾</span>
            <span class="text-sm font-medium text-white/95">Abre tu puesto de venta en 1-clic cuando lo desees</span>
          </div>
        </div>
      </div>

      <!-- Footer info -->
      <div class="relative z-10 text-xs text-white/60 flex justify-between items-center border-t border-white/15 pt-6">
        <span>© Mercadito Bolivia</span>
        <span>Comunidad & Confianza</span>
      </div>
    </aside>

    <!-- Right Content Area -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Top Action Bar -->
      <header class="w-full px-6 py-4 flex items-center justify-between">
        <!-- Mobile Logo -->
        <a routerLink="/" class="lg:hidden flex items-center gap-2 font-display font-bold text-lg text-text-main">
          <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
            </svg>
          </span>
          Mercadito
        </a>

        <a routerLink="/" class="hidden lg:flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
            <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
          </svg>
          Volver a la tienda
        </a>

        <!-- Theme Toggle Button -->
        <button
          type="button"
          (click)="themeSvc.toggleTheme()"
          class="p-2.5 rounded-full border border-border-subtle bg-surface hover:bg-surface-elevated text-text-main transition-colors shadow-sm"
          [attr.aria-label]="themeSvc.isDarkMode() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          [title]="themeSvc.isDarkMode() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        >
          <svg *ngIf="themeSvc.isDarkMode()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-secondary">
            <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18.75a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25a.75.75 0 0 1 .75-.75ZM6.166 17.834a.75.75 0 0 0 1.06 1.06l1.591-1.59a.75.75 0 1 0-1.06-1.061l-1.591 1.59ZM4.5 12a.75.75 0 0 1-.75-.75H1.5a.75.75 0 0 1 0 1.5h2.25A.75.75 0 0 1 4.5 12ZM6.166 6.166a.75.75 0 0 1 1.06 0l1.59 1.591a.75.75 0 1 1-1.061 1.06l-1.59-1.591a.75.75 0 0 1 0-1.06Z" />
          </svg>
          <svg *ngIf="!themeSvc.isDarkMode()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-text-muted">
            <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clip-rule="evenodd" />
          </svg>
        </button>
      </header>

      <!-- Form Center Container -->
      <main class="flex-1 flex items-center justify-center p-6 sm:p-12 animate-fade-in">
        <div class="w-full max-w-md bg-surface border border-border-subtle rounded-2xl p-6 sm:p-10 shadow-md transition-colors">

          <div class="mb-8">
            <h1 class="text-3xl font-display font-bold text-text-main mb-2 tracking-tight">Crear cuenta</h1>
            <p class="text-text-muted text-sm">Empieza a comprar y vender productos frescos en tu comunidad.</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Name & Surname Grid (Responsive) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-text-main mb-1.5">Nombre</label>
                <input
                  [(ngModel)]="firstName"
                  name="firstName"
                  type="text"
                  autocomplete="given-name"
                  placeholder="Ana"
                  class="w-full bg-base border border-border-subtle text-text-main placeholder:text-text-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  required
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-text-main mb-1.5">Apellido</label>
                <input
                  [(ngModel)]="lastName"
                  name="lastName"
                  type="text"
                  autocomplete="family-name"
                  placeholder="García"
                  class="w-full bg-base border border-border-subtle text-text-main placeholder:text-text-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  required
                />
              </div>
            </div>

            <!-- Email Field -->
            <div>
              <label class="block text-sm font-medium text-text-main mb-1.5">Correo electrónico</label>
              <input
                [(ngModel)]="email"
                name="email"
                type="email"
                autocomplete="email"
                placeholder="tu@correo.com"
                class="w-full bg-base border border-border-subtle text-text-main placeholder:text-text-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                required
              />
            </div>

            <!-- Password Field -->
            <div>
              <label class="block text-sm font-medium text-text-main mb-1.5">Contraseña</label>
              <div class="relative">
                <input
                  [(ngModel)]="password"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  class="w-full bg-base border border-border-subtle text-text-main placeholder:text-text-subtle rounded-xl pl-4 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  required
                  minlength="8"
                />
                <!-- Show / Hide password button -->
                <button
                  type="button"
                  (click)="toggleShowPassword()"
                  class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-subtle hover:text-text-main transition-colors"
                  aria-label="Mostrar u ocultar contraseña"
                >
                  <svg *ngIf="!showPassword()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    <path fill-rule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113C21.185 17.023 16.97 20.25 12 20.25c-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clip-rule="evenodd" />
                  </svg>
                  <svg *ngIf="showPassword()" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5">
                    <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 1 0 1.06-1.06l-18-18ZM2.26 9.77a.75.75 0 0 1 1.02.26C4.46 11.95 6.3 13.5 8.5 14.35l-1.39-1.39a6.002 6.002 0 0 1-1.37-3.19Z" />
                    <path d="M12 6.75c1.6 0 3.07.54 4.24 1.45l-1.46 1.46A3.75 3.75 0 0 0 9.66 11.2l-1.48 1.48C7.45 11.75 7.25 10.65 7.25 9.5c0-1.52.61-2.9 1.6-3.9A6.73 6.73 0 0 1 12 6.75Z" />
                  </svg>
                </button>
              </div>
              <p class="mt-1 text-xs text-text-subtle">
                {{ password.length >= 8 ? '✓ Longitud de contraseña adecuada' : 'Mínimo 8 caracteres requeridos' }}
              </p>
            </div>

            <!-- Error Banner -->
            <div *ngIf="errorMsg()" class="text-red-600 dark:text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0 mt-0.5">
                <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" />
              </svg>
              <span>{{ errorMsg() }}</span>
            </div>

            <!-- Success Banner -->
            <div *ngIf="successMsg()" class="text-accent-green dark:text-accent-green/90 text-sm bg-accent-green/10 border border-accent-green/20 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 shrink-0 mt-0.5">
                <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l4.25-5.94Z" clip-rule="evenodd" />
              </svg>
              <span>{{ successMsg() }}</span>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              [disabled]="loading()"
              class="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-semibold py-3.5 rounded-xl shadow-primary transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
            >
              <span *ngIf="loading()" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Crear cuenta
            </button>
          </form>

          <!-- Login Prompt -->
          <div class="mt-8 pt-6 border-t border-border-subtle text-center text-sm text-text-muted">
            ¿Ya tienes una cuenta?
            <a routerLink="/auth/login" class="text-primary font-semibold hover:underline ml-1">Inicia sesión</a>
          </div>

        </div>
      </main>
    </div>
  </div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  themeSvc = inject(ThemeService);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  showPassword = signal(false);

  toggleShowPassword() {
    this.showPassword.update((v) => !v);
  }

  onSubmit() {
    if (!this.firstName || !this.lastName || !this.email || !this.password) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.register(this.firstName, this.lastName, this.email, this.password).subscribe({
      next: () => {
        this.successMsg.set('¡Cuenta creada con éxito! Redirigiendo al inicio de sesión...');
        setTimeout(() => this.router.navigateByUrl('/auth/login'), 1500);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Error al crear la cuenta. Intenta con otro correo.');
        this.loading.set(false);
      },
    });
  }
}
