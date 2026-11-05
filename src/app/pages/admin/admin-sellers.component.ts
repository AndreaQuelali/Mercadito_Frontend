import { Component, OnInit, inject, signal } from '@angular/core';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Seller, SellerService } from '../../services/seller.service';
import { SellerStatus } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-admin-sellers',
  standalone: true,
  imports: [UiEmptyComponent, CommonModule, RouterLink],
  template: `
  <main class="ui-page max-w-5xl">
    <header class="space-y-3 mb-8">
      <h1 class="ui-title">Vendedores</h1>
      <p class="ui-lead">Suspende o reactiva los puestos de los vendedores.</p>
    </header>

    <div *ngIf="loading()" class="space-y-3">
      <div *ngFor="let i of [1,2,3]" class="ui-skel h-24"></div>
    </div>

    <ui-empty *ngIf="!loading() && sellers().length === 0" icon="users" title="No hay vendedores registrados" text="Cuando alguien abra un puesto, aparecerá aquí para que lo administres."></ui-empty>

    <div *ngIf="!loading() && sellers().length > 0" class="space-y-3">
      <article *ngFor="let s of sellers()" class="ui-panel flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="font-display text-2xl font-bold leading-tight">{{ s.businessName }}</p>
          <p class="text-text-muted" *ngIf="s.user">{{ s.user.firstName }} {{ s.user.lastName }} · {{ s.user.email }}</p>
          <p class="text-text-muted" *ngIf="s.location">{{ s.location }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-block px-3 py-1 font-semibold" [ngClass]="s.status === 'active' ? 'st-delivered' : 'st-pending'">
            {{ s.status === 'active' ? 'Activo' : 'Suspendido' }}
          </span>
          <button
            type="button"
            (click)="toggleStatus(s)"
            [disabled]="updating() === s.id"
            class="ui-btn ui-btn-ghost ui-btn-sm"
          >
            <span *ngIf="updating() === s.id" class="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
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
