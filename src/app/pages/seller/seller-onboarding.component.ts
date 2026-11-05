import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SellerService } from '../../services/seller.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-seller-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <main class="ui-page max-w-2xl">
    <h1 class="ui-title">Quiero vender</h1>
    <p class="ui-lead mt-3">Crea el perfil de tu puesto. Seguirás comprando en Mercadito con la misma cuenta.</p>

    <form (ngSubmit)="onSubmit()" class="ui-panel mt-8 space-y-5">
      <label class="block">
        <span class="ui-label">Nombre del puesto *</span>
        <input id="onb-name" [(ngModel)]="model.businessName" name="businessName" type="text" required class="ui-field" placeholder="Ej. Puesto de Ana" />
      </label>
      <label class="block">
        <span class="ui-label">Descripción</span>
        <textarea id="onb-desc" [(ngModel)]="model.description" name="description" rows="3" class="ui-field" placeholder="Qué vendes, horarios, etc."></textarea>
      </label>
      <label class="block">
        <span class="ui-label">Ubicación</span>
        <input id="onb-location" [(ngModel)]="model.location" name="location" type="text" class="ui-field" placeholder="Pasillo 3, puesto 12" />
      </label>
      <label class="block">
        <span class="ui-label">URL del logo o avatar</span>
        <input id="onb-avatar" [(ngModel)]="model.avatarUrl" name="avatarUrl" type="url" class="ui-field" placeholder="https://..." />
      </label>

      <p *ngIf="errorMsg()" class="ui-alert-error" role="alert">{{ errorMsg() }}</p>

      <div class="flex flex-wrap items-center gap-3 pt-2">
        <button id="onb-submit" type="submit" [disabled]="saving() || !model.businessName.trim()" class="ui-btn">
          <span *ngIf="saving()" class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          Crear mi puesto
        </button>
        <a routerLink="/home" class="ui-btn ui-btn-ghost">Cancelar</a>
      </div>
    </form>
  </main>
  `,
})
export class SellerOnboardingComponent {
  private sellerSvc = inject(SellerService);
  private router = inject(Router);
  private toast = inject(ToastService);

  saving = signal(false);
  errorMsg = signal<string | null>(null);

  model = {
    businessName: '',
    description: '',
    location: '',
    avatarUrl: '',
  };

  onSubmit(): void {
    const businessName = this.model.businessName.trim();
    if (!businessName) return;

    this.saving.set(true);
    this.errorMsg.set(null);

    const payload: {
      businessName: string;
      description?: string;
      location?: string;
      avatarUrl?: string;
    } = { businessName };

    if (this.model.description.trim()) payload.description = this.model.description.trim();
    if (this.model.location.trim()) payload.location = this.model.location.trim();
    if (this.model.avatarUrl.trim()) payload.avatarUrl = this.model.avatarUrl.trim();

    this.sellerSvc.create(payload).subscribe({
      next: () => {
        this.toast.success('¡Tu puesto está listo!');
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          err?.message ||
          'No se pudo crear el puesto. Intenta de nuevo.';
        this.errorMsg.set(typeof msg === 'string' ? msg : 'No se pudo crear el puesto.');
        this.saving.set(false);
      },
    });
  }
}
