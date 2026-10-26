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
  <main class="ui-page space-y-8">
    <header class="space-y-3">
      <h1 class="ui-title">{{ sellerSvc.mine()?.businessName || 'Tu puesto' }}</h1>
      <p class="ui-lead">Gestiona tus productos y pedidos. Ventas e inventario llegan en una próxima versión.</p>
    </header>

    <p *ngIf="!auth.canManageStore()" class="ui-alert-warn">
      Tu puesto está suspendido. Puedes ver productos y órdenes, y editar el perfil del puesto.
    </p>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <a routerLink="/dashboard/products" class="ui-panel block hover:bg-surface-hover transition">
        <h2 class="ui-h2 !text-2xl">Productos</h2>
        <p class="text-text-muted mt-2">Lista, alta y edición de tu catálogo.</p>
        <span class="ui-link inline-block mt-4">Ir a productos</span>
      </a>
      <a routerLink="/dashboard/orders" class="ui-panel block hover:bg-surface-hover transition">
        <h2 class="ui-h2 !text-2xl">Pedidos</h2>
        <p class="text-text-muted mt-2">Órdenes de tus clientes y su estado.</p>
        <span class="ui-link inline-block mt-4">Ver pedidos</span>
      </a>
      <a routerLink="/dashboard/sales" class="ui-panel block opacity-80">
        <h2 class="ui-h2 !text-2xl">Ventas</h2>
        <p class="text-text-muted mt-2">Métricas de ventas de tu puesto.</p>
        <span class="inline-block mt-4 font-semibold text-text-muted">Pronto</span>
      </a>
      <a routerLink="/dashboard/inventory" class="ui-panel block opacity-80">
        <h2 class="ui-h2 !text-2xl">Inventario</h2>
        <p class="text-text-muted mt-2">Stock y control de existencias.</p>
        <span class="inline-block mt-4 font-semibold text-text-muted">Pronto</span>
      </a>
    </section>
  </main>
  `,
})
export class SellerHomeComponent {
  sellerSvc = inject(SellerService);
  auth = inject(AuthService);
}
