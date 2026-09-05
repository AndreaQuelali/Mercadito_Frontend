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
  <main class="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      <h1 class="text-2xl font-bold text-slate-900">Quiero vender</h1>
      <p class="text-slate-500 mt-2 text-sm">
        Crea el perfil de tu puesto. Podrás seguir comprando en Mercadito con la misma cuenta.
      </p>

      <form (ngSubmit)="onSubmit()" class="mt-6 space-y-4">
        <div>
          <label class="block text-sm text-slate-600 mb-1">Nombre del puesto *</label>
          <input [(ngModel)]="model.businessName" name="businessName" type="text" required
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ej. Puesto de Ana" />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">Descripción</label>
          <textarea [(ngModel)]="model.description" name="description" rows="3"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Qué vendes, horarios, etc."></textarea>
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">Ubicación</label>
          <input [(ngModel)]="model.location" name="location" type="text"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Pasillo 3, puesto 12" />
        </div>
        <div>
          <label class="block text-sm text-slate-600 mb-1">URL del logo / avatar</label>
          <input [(ngModel)]="model.avatarUrl" name="avatarUrl" type="url"
            class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="https://..." />
        </div>

        <div *ngIf="errorMsg()" class="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">
          {{ errorMsg() }}
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="submit" [disabled]="saving() || !model.businessName.trim()"
            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
            <span *ngIf="saving()" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Crear mi puesto
          </button>
          <a routerLink="/" class="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-sm">Cancelar</a>
        </div>
      </form>
    </div>
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
        this.router.navigateByUrl('/seller');
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
