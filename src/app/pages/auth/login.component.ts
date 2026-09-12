import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutComponent } from '../../components/ui/auth-layout.component';
import { UiFieldComponent } from '../../components/ui/ui-field.component';
import { UiButtonComponent } from '../../components/ui/ui-button.component';
import { UiAlertComponent } from '../../components/ui/ui-alert.component';

@Component({
  selector: 'app-login',
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
      quote="El mercado local, en la palma de tu mano."
      subtitle="Conectamos productores y compradores de tu comunidad."
    >
      <h1 class="text-3xl font-display font-bold text-text-main mb-2">Bienvenido de vuelta</h1>
      <p class="text-text-muted mb-8">Ingresa a tu cuenta para continuar</p>

      <form (ngSubmit)="onSubmit()" class="space-y-5">
        <ui-field
          label="Correo electrónico"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          [(ngModel)]="email"
          [required]="true"
        ></ui-field>

        <div>
          <ui-field
            label="Contraseña"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            [(ngModel)]="password"
            [required]="true"
          ></ui-field>
          <div class="mt-2 text-right">
            <a
              routerLink="/auth/forgot-password"
              class="text-sm text-primary font-medium hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <ui-alert *ngIf="errorMsg()" tone="error">{{ errorMsg() }}</ui-alert>

        <ui-button type="submit" variant="primary" [fullWidth]="true" [loading]="loading()">
          {{ loading() ? 'Iniciando…' : 'Iniciar sesión' }}
        </ui-button>
      </form>

      <p class="mt-6 text-center text-sm text-text-muted">
        ¿No tienes cuenta?
        <a routerLink="/auth/register" class="text-primary font-medium hover:underline">Regístrate gratis</a>
      </p>
    </auth-layout>
  `,
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  private returnUrl = '/';

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) {
      this.returnUrl = raw;
    }
  }

  onSubmit() {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'Credenciales incorrectas. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }
}
