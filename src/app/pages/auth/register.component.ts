import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutComponent } from '../../components/ui/auth-layout.component';
import { UiFieldComponent } from '../../components/ui/ui-field.component';
import { UiButtonComponent } from '../../components/ui/ui-button.component';
import { UiAlertComponent } from '../../components/ui/ui-alert.component';

@Component({
  selector: 'app-register',
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
      quote="Únete a la comunidad de tu mercado local."
      subtitle="Miles de productos frescos y artesanales, cerca de ti."
    >
      <h1 class="text-3xl font-display font-bold text-text-main mb-2">Crear cuenta</h1>
      <p class="text-text-muted mb-8">Empieza a comprar y vender en tu comunidad</p>

      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ui-field
            label="Nombre"
            name="firstName"
            type="text"
            autocomplete="given-name"
            placeholder="Ana"
            [(ngModel)]="firstName"
            [required]="true"
          ></ui-field>
          <ui-field
            label="Apellido"
            name="lastName"
            type="text"
            autocomplete="family-name"
            placeholder="García"
            [(ngModel)]="lastName"
            [required]="true"
          ></ui-field>
        </div>

        <ui-field
          label="Correo electrónico"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          [(ngModel)]="email"
          [required]="true"
        ></ui-field>

        <ui-field
          label="Contraseña"
          name="password"
          type="password"
          autocomplete="new-password"
          placeholder="Mínimo 8 caracteres"
          [(ngModel)]="password"
          [minlength]="8"
          [required]="true"
        ></ui-field>

        <ui-field
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="Repite tu contraseña"
          [(ngModel)]="confirmPassword"
          [minlength]="8"
          [error]="confirmError()"
          [required]="true"
        ></ui-field>

        <ui-alert *ngIf="errorMsg()" tone="error">{{ errorMsg() }}</ui-alert>
        <ui-alert *ngIf="successMsg()" tone="success">{{ successMsg() }}</ui-alert>

        <ui-button type="submit" variant="primary" [fullWidth]="true" [loading]="loading()">
          {{ loading() ? 'Creando…' : 'Crear cuenta' }}
        </ui-button>
      </form>

      <p class="mt-6 text-center text-sm text-text-muted">
        ¿Ya tienes cuenta?
        <a routerLink="/auth/login" class="text-primary font-medium hover:underline">Inicia sesión</a>
      </p>
    </auth-layout>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  confirmError = signal('');

  onSubmit() {
    this.confirmError.set('');
    this.errorMsg.set(null);

    if (this.password.length < 8) {
      this.errorMsg.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.confirmError.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
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
