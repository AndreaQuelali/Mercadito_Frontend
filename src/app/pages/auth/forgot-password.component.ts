import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutComponent } from '../../components/ui/auth-layout.component';
import { UiFieldComponent } from '../../components/ui/ui-field.component';
import { UiButtonComponent } from '../../components/ui/ui-button.component';
import { UiAlertComponent } from '../../components/ui/ui-alert.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    AuthLayoutComponent,
    UiFieldComponent,
    UiButtonComponent,
    UiAlertComponent,
  ],
  template: `
    <auth-layout
      quote="Recupera el acceso a tu puesto."
      subtitle="Te enviaremos un enlace si el correo está registrado."
    >
      <h1 class="text-3xl font-display font-bold text-text-main mb-2">¿Olvidaste tu contraseña?</h1>
      <p class="text-text-muted mb-8">
        Ingresa tu correo y te enviaremos instrucciones para restablecerla.
      </p>

      <form *ngIf="!sent()" (ngSubmit)="onSubmit()" class="space-y-5">
        <ui-field
          label="Correo electrónico"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          [(ngModel)]="email"
          [required]="true"
        ></ui-field>

        <ui-alert *ngIf="errorMsg()" tone="error">{{ errorMsg() }}</ui-alert>

        <ui-button type="submit" variant="primary" [fullWidth]="true" [loading]="loading()">
          {{ loading() ? 'Enviando…' : 'Enviar enlace' }}
        </ui-button>
      </form>

      <div *ngIf="sent()" class="space-y-5">
        <ui-alert tone="success">
          Si el correo existe, enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada.
        </ui-alert>
        <a
          routerLink="/auth/login"
          class="inline-flex w-full items-center justify-center font-semibold rounded-xl py-3 px-4
                 bg-primary hover:bg-primary-hover text-white transition"
        >
          Volver al inicio de sesión
        </a>
      </div>

      <p *ngIf="!sent()" class="mt-6 text-center text-sm text-text-muted">
        <a routerLink="/auth/login" class="text-primary font-medium hover:underline">Volver al inicio de sesión</a>
      </p>
    </auth-layout>
  `,
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);

  email = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  sent = signal(false);

  onSubmit() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.sent.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'No pudimos procesar la solicitud. Intenta de nuevo.');
        this.loading.set(false);
      },
    });
  }
}
