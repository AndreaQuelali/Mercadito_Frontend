import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <div class="min-h-screen bg-stone-50 flex">
    <!-- Left panel -->
    <aside class="hidden lg:flex lg:w-1/2 bg-brand-700 relative overflow-hidden flex-col justify-between p-12">
      <div class="absolute inset-0 opacity-10"
           style="background-image: url('https://www.transparenttextures.com/patterns/asfalt-dark.png')"></div>
      <a routerLink="/" class="relative z-10 flex items-center gap-3 text-white">
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-6 w-6">
            <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
          </svg>
        </span>
        <span class="text-xl font-semibold tracking-wide">Mercadito</span>
      </a>
      <div class="relative z-10">
        <blockquote class="text-white/90 text-3xl font-serif leading-snug mb-6">
          "Únete a la comunidad<br/>de tu mercado local."
        </blockquote>
        <p class="text-white/60 text-sm">Miles de productos frescos y artesanales, cerca de ti.</p>
      </div>
    </aside>

    <!-- Right panel -->
    <main class="flex-1 flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-md">
        <a routerLink="/" class="lg:hidden flex items-center gap-2 mb-8 text-slate-700 font-semibold">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V9a3 3 0 0 1-3 3v6a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18v-6a3 3 0 0 1-3-3V7.5Z"/>
            </svg>
          </span>
          Mercadito
        </a>

        <h1 class="text-3xl font-bold text-slate-900 mb-2">Crear cuenta</h1>
        <p class="text-slate-500 mb-8">Empieza a comprar y vender en tu comunidad</p>

        <form (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
              <input
                [(ngModel)]="firstName"
                name="firstName"
                type="text"
                autocomplete="given-name"
                placeholder="Ana"
                class="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Apellido</label>
              <input
                [(ngModel)]="lastName"
                name="lastName"
                type="text"
                autocomplete="family-name"
                placeholder="García"
                class="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                required
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
            <input
              [(ngModel)]="email"
              name="email"
              type="email"
              autocomplete="email"
              placeholder="tu@correo.com"
              class="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
            <input
              [(ngModel)]="password"
              name="password"
              type="password"
              autocomplete="new-password"
              placeholder="Mínimo 8 caracteres"
              class="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              required
              minlength="8"
            />
          </div>

          <div *ngIf="errorMsg()" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {{ errorMsg() }}
          </div>
          <div *ngIf="successMsg()" class="text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            {{ successMsg() }}
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            <span *ngIf="loading()" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Crear cuenta
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?
          <a routerLink="/auth/login" class="text-brand-600 font-medium hover:underline">Inicia sesión</a>
        </p>
      </div>
    </main>
  </div>
  `
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  onSubmit() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.register(this.firstName, this.lastName, this.email, this.password).subscribe({
      next: () => {
        this.successMsg.set('¡Cuenta creada! Redirigiendo al inicio de sesión...');
        setTimeout(() => this.router.navigateByUrl('/auth/login'), 1500);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Error al crear la cuenta. Intenta con otro correo.');
        this.loading.set(false);
      },
    });
  }
}
