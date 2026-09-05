import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Seller, SellerService } from '../../services/seller.service';
import { SellerStatus } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-sellers',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Sellers</h1>
        <p class="text-slate-500 text-sm mt-1">Suspende o reactiva puestos de vendedores.</p>
      </div>
      <a routerLink="/" class="text-sm text-slate-500 hover:text-slate-800">Inicio</a>
    </div>

    <div *ngIf="loading()" class="space-y-3 animate-pulse">
      <div *ngFor="let i of [1,2,3]" class="h-20 bg-white rounded-xl border border-slate-200"></div>
    </div>

    <div *ngIf="!loading() && sellers().length === 0" class="text-center py-16 text-slate-500">
      No hay sellers registrados.
    </div>

    <div *ngIf="!loading() && sellers().length > 0" class="space-y-3">
      <article *ngFor="let s of sellers()"
        class="bg-white rounded-xl border border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="font-semibold text-slate-900">{{ s.businessName }}</p>
          <p class="text-sm text-slate-500" *ngIf="s.user">
            {{ s.user.firstName }} {{ s.user.lastName }} · {{ s.user.email }}
          </p>
          <p class="text-xs text-slate-400 mt-0.5" *ngIf="s.location">{{ s.location }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span [class]="s.status === 'active'
            ? 'text-xs font-medium px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200'
            : 'text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200'">
            {{ s.status === 'active' ? 'Activo' : 'Suspendido' }}
          </span>
          <button
            (click)="toggleStatus(s)"
            [disabled]="updating() === s.id"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            <span *ngIf="updating() === s.id" class="h-3 w-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
            {{ s.status === 'active' ? 'Suspender' : 'Reactivar' }}
          </button>
        </div>
      </article>
    </div>
  </main>
  `,
})
export class AdminSellersComponent implements OnInit {
  private sellerSvc = inject(SellerService);
  private toast = inject(ToastService);

  sellers = signal<Seller[]>([]);
  loading = signal(true);
  updating = signal<string | null>(null);

  ngOnInit(): void {
    this.fetch();
  }

  toggleStatus(seller: Seller): void {
    const next: SellerStatus = seller.status === 'active' ? 'suspended' : 'active';
    this.updating.set(seller.id);
    this.sellerSvc.updateStatus(seller.id, next).subscribe({
      next: (updated) => {
        this.sellers.update((list) =>
          list.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
        );
        this.toast.success(
          next === 'suspended' ? 'Seller suspendido' : 'Seller reactivado'
        );
        this.updating.set(null);
      },
      error: () => {
        this.toast.error('No se pudo actualizar el estado');
        this.updating.set(null);
      },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.sellerSvc.listAll().subscribe({
      next: (list) => {
        this.sellers.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('No se pudo cargar la lista');
        this.loading.set(false);
      },
    });
  }
}
