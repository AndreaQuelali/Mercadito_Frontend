import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutComponent } from '../../components/ui/auth-layout.component';
import { UiFieldComponent } from '../../components/ui/ui-field.component';
import { UiButtonComponent } from '../../components/ui/ui-button.component';
import { UiAlertComponent } from '../../components/ui/ui-alert.component';
import {
  ResetFieldErrors,
  hasFieldErrors,
  passwordsMatch,
  validatePasswordPolicy,
  validateResetForm,
} from './auth-validation';

@Component({
  selector: 'app-reset-password',
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
      quote="Elige una contraseña nueva."
      subtitle="El enlace de recuperación es válido por un tiempo limitado."
    >
      <h1 class="text-3xl font-display font-bold text-text-main mb-2">Nueva contraseña</h1>
      <p class="text-text-muted mb-8">Ingresa y confirma tu nueva contraseña.</p>

      <div *ngIf="!token" class="mb-5">
        <ui-alert tone="error">
          Enlace inválido o incompleto. Solicita uno nuevo desde
          <a routerLink="/auth/forgot-password" class="underline font-medium">recuperar contraseña</a>.
        </ui-alert>
      </div>

      <form *ngIf="token && !done()" (ngSubmit)="onSubmit()" class="space-y-5" novalidate>
        <ui-field
          label="Nueva contraseña"
          name="password"
          type="password"
          autocomplete="new-password"
          placeholder="Mín. 8, mayúscula, número y símbolo"
          [(ngModel)]="password"
          (valueChange)="onValueChange('password', $event)"
          [error]="fieldErrors().password"
          (blurred)="onBlur('password')"
        ></ui-field>

        <ui-field
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autocomplete="new-password"
          placeholder="Repite tu contraseña"
          [(ngModel)]="confirmPassword"
          (valueChange)="onValueChange('confirmPassword', $event)"
          [error]="fieldErrors().confirmPassword"
          (blurred)="onBlur('confirmPassword')"
        ></ui-field>

        <ui-alert *ngIf="errorMsg()" tone="error">{{ errorMsg() }}</ui-alert>

        <ui-button
          type="submit"
          variant="primary"
          [fullWidth]="true"
          [loading]="loading()"
          [disabled]="!formValid()"
        >
          {{ loading() ? 'Guardando…' : 'Restablecer contraseña' }}
        </ui-button>
      </form>

      <div *ngIf="done()" class="space-y-5">
        <ui-alert tone="success">Contraseña actualizada. Ya puedes iniciar sesión.</ui-alert>
        <a
          routerLink="/auth/login"
          class="inline-flex w-full items-center justify-center font-semibold rounded-xl py-3 px-4
                 bg-primary hover:bg-primary-hover text-white transition"
        >
          Ir a iniciar sesión
        </a>
      </div>
    </auth-layout>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  token = '';
  password = '';
  confirmPassword = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  fieldErrors = signal<ResetFieldErrors>({ password: '', confirmPassword: '' });
  formValid = signal(false);
  done = signal(false);

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.refreshFormValid();
  }

  refreshFormValid(): void {
    const fieldsOk = !hasFieldErrors(validateResetForm(this.password, this.confirmPassword));
    this.formValid.set(!!this.token && fieldsOk);
  }

  onValueChange(field: 'password' | 'confirmPassword', value: string): void {
    this[field] = value;
    this.refreshFormValid();
  }

  onBlur(field: 'password' | 'confirmPassword'): void {
    const next = { ...this.fieldErrors() };
    if (field === 'password') {
      next.password = validatePasswordPolicy(this.password) ?? '';
      if (this.confirmPassword) {
        next.confirmPassword = passwordsMatch(this.password, this.confirmPassword) ?? '';
      }
    } else {
      next.confirmPassword = passwordsMatch(this.password, this.confirmPassword) ?? '';
    }
    this.fieldErrors.set(next);
    this.refreshFormValid();
  }

  onSubmit() {
    this.errorMsg.set(null);
    if (!this.token) return;

    const errors = validateResetForm(this.password, this.confirmPassword);
    this.fieldErrors.set(errors);
    this.refreshFormValid();
    if (hasFieldErrors(errors)) return;

    this.loading.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.done.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(
          err?.error?.message ??
            'No pudimos restablecer la contraseña. El enlace puede haber expirado.'
        );
        this.loading.set(false);
      },
    });
  }
}
