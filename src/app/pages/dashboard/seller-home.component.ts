import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SellerService } from '../../services/seller.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-seller-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <header>
      <p class="text-sm text-text-muted">Panel de gestión</p>
      <h1 class="text-2xl font-display font-bold text-text-main mt-1">
        {{ sellerSvc.mine()?.businessName || 'Tu puesto' }}
      </h1>
      <p class="text-text-muted mt-1 max-w-xl">
        Gestiona productos y pedidos. Ventas e inventario llegan en una próxima versión.
      </p>
    </header>

    <div *ngIf="!auth.canManageStore()"
         class="rounded-xl border border-secondary/30 bg-secondary-light px-4 py-3 text-sm text-text-main">
      Tu puesto está suspendido. Puedes ver productos y órdenes, y editar el perfil del puesto.
    </div>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <a routerLink="/dashboard/products"
         class="rounded-2xl border border-border-subtle bg-surface p-5 hover:border-primary transition">
        <h2 class="font-display font-semibold text-text-main">Productos</h2>
        <p class="text-sm text-text-muted mt-1">Lista, alta y edición de tu catálogo.</p>
        <span class="inline-block mt-3 text-sm font-semibold text-primary">Ir a productos</span>
      </a>
      <a routerLink="/dashboard/orders"
         class="rounded-2xl border border-border-subtle bg-surface p-5 hover:border-primary transition">
        <h2 class="font-display font-semibold text-text-main">Pedidos</h2>
        <p class="text-sm text-text-muted mt-1">Órdenes de tus clientes y su estado.</p>
        <span class="inline-block mt-3 text-sm font-semibold text-primary">Ver pedidos</span>
      </a>
      <a routerLink="/dashboard/sales"
         class="rounded-2xl border border-dashed border-border-medium bg-surface p-5">
        <h2 class="font-display font-semibold text-text-main">Ventas</h2>
        <p class="text-sm text-text-muted mt-1">Métricas de ventas de tu puesto.</p>
        <span class="inline-block mt-3 text-xs font-bold uppercase tracking-wide text-text-subtle">Próximamente</span>
      </a>
      <a routerLink="/dashboard/inventory"
         class="rounded-2xl border border-dashed border-border-medium bg-surface p-5">
        <h2 class="font-display font-semibold text-text-main">Inventario</h2>
        <p class="text-sm text-text-muted mt-1">Stock y control de existencias.</p>
        <span class="inline-block mt-3 text-xs font-bold uppercase tracking-wide text-text-subtle">Próximamente</span>
      </a>
    </section>
  </main>
  `,
})
export class SellerHomeComponent {
  sellerSvc = inject(SellerService);
  auth = inject(AuthService);
}
