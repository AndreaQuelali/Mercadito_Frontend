import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../services/products.service';
import { SellerProductCardComponent, SellerProduct } from '../../components/seller-product-card/seller-product-card.component';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { SellerService } from '../../services/seller.service';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SellerProductCardComponent],
  template: `
  <main class="ui-page space-y-8">
    <header class="flex items-end justify-between flex-wrap gap-4">
      <div class="space-y-3">
        <h1 class="ui-title">Productos</h1>
        <p class="ui-lead">Gestiona el catálogo de tu puesto.</p>
      </div>
      <a *ngIf="auth.canManageStore()" id="seller-new-product" routerLink="/dashboard/products/new" class="ui-btn">Nuevo producto</a>
    </header>

    <p *ngIf="!auth.canManageStore()" class="ui-alert-warn">
      Tu puesto está suspendido. Puedes ver tus productos y órdenes, y editar el puesto, pero no crear ni modificar productos.
    </p>

    <div *ngIf="loading()" class="space-y-3">
      <div *ngFor="let i of [1,2,3]" class="ui-skel h-32"></div>
    </div>

    <div *ngIf="!loading() && products().length === 0" class="ui-empty">
      <h2 class="ui-h2">Aún no tienes productos</h2>
      <p class="text-lg text-text-muted">Publica tu primer producto y empieza a vender.</p>
      <p *ngIf="auth.canManageStore()"><a routerLink="/dashboard/products/new" class="ui-btn">Agregar producto</a></p>
    </div>

    <section *ngIf="!loading() && products().length > 0" class="space-y-3">
      <app-seller-product-card
        *ngFor="let p of products()"
        [product]="p"
        [canManage]="auth.canManageStore()"
        (remove)="onDelete($event)"
        (edit)="onEdit($event)"
      />
    </section>
  </main>
  `
})
export class SellerDashboardComponent implements OnInit {
  private productService = inject(ProductService);
  private sellerSvc = inject(SellerService);
  private router = inject(Router);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  products = signal<SellerProduct[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.sellerSvc.getMine().subscribe({ error: () => undefined });
    this.fetch();
  }

  onDelete(id: number): void {
    if (!this.auth.canManageStore()) return;
    if (!confirm('¿Eliminar este producto?')) return;
    this.productService.delete(id).subscribe({
      next: () => { this.toast.success('Producto eliminado'); this.fetch(); },
      error: () => this.toast.error('No se pudo eliminar. Intenta nuevamente.'),
    });
  }

  onEdit(id: number): void {
    if (!this.auth.canManageStore()) return;
    this.router.navigateByUrl(`/dashboard/products/edit/${id}`);
  }

  private fetch(): void {
    this.loading.set(true);
    this.productService.listSeller().subscribe({
      next: (items) => { this.products.set(items as SellerProduct[]); this.loading.set(false); },
      error: () => { this.products.set([]); this.loading.set(false); },
    });
  }
}
