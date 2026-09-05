import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Seller, SellerService } from '../../services/seller.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-seller-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <main class="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Configuración del puesto</h1>
        <p class="text-slate-500 text-sm mt-1">Edita los datos de tu perfil de vendedor.</p>
      </div>
      <a routerLink="/seller" class="text-sm text-slate-500 hover:text-slate-800">Volver al panel</a>
    </div>

    <div *ngIf="seller()?.status === 'suspended'"
         class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Tu puesto está suspendido. Puedes editar estos datos, pero no publicar ni gestionar productos hasta que un admin lo reactive.
    </div>

    <div *ngIf="loading()" class="flex justify-center py-16">
      <div class="h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <form *ngIf="!loading() && seller()" (ngSubmit)="onSubmit()"
          class="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <label class="block text-sm text-slate-600 mb-1">Nombre del puesto *</label>
        <input [(ngModel)]="model.businessName" name="businessName" type="text" required
          class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Descripción</label>
        <textarea [(ngModel)]="model.description" name="description" rows="3"
          class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">Ubicación</label>
        <input [(ngModel)]="model.location" name="location" type="text"
          class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>
      <div>
        <label class="block text-sm text-slate-600 mb-1">URL del logo / avatar</label>
        <input [(ngModel)]="model.avatarUrl" name="avatarUrl" type="url"
          class="w-full rounded-md bg-slate-50 border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      <div *ngIf="errorMsg()" class="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{{ errorMsg() }}</div>

      <button type="submit" [disabled]="saving()"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50">
        <span *ngIf="saving()" class="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        Guardar cambios
      </button>
    </form>
  </main>
  `,
})
export class SellerSettingsComponent implements OnInit {
  private sellerSvc = inject(SellerService);
  private toast = inject(ToastService);

  seller = signal<Seller | null>(null);
  loading = signal(true);
  saving = signal(false);
  errorMsg = signal<string | null>(null);

  model = {
    businessName: '',
    description: '',
    location: '',
    avatarUrl: '',
  };

  ngOnInit(): void {
    this.sellerSvc.getMine().subscribe({
      next: (s) => {
        this.seller.set(s);
        this.model = {
          businessName: s.businessName,
          description: s.description ?? '',
          location: s.location ?? '',
          avatarUrl: s.avatarUrl ?? '',
        };
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudo cargar el perfil.');
        this.loading.set(false);
      },
    });
  }

  onSubmit(): void {
    this.saving.set(true);
    this.errorMsg.set(null);
    this.sellerSvc
      .updateMine({
        businessName: this.model.businessName.trim(),
        description: this.model.description.trim() || null,
        location: this.model.location.trim() || null,
        avatarUrl: this.model.avatarUrl.trim() || null,
      })
      .subscribe({
        next: (s) => {
          this.seller.set(s);
          this.toast.success('Perfil actualizado');
          this.saving.set(false);
        },
        error: () => {
          this.errorMsg.set('No se pudieron guardar los cambios.');
          this.saving.set(false);
        },
      });
  }
}
