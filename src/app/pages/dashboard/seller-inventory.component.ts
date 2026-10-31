import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductService } from '../../services/products.service';
import { ProductCard } from '../../components/product-card/product-card.component';
import { SellerService } from '../../services/seller.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

/** Used only if the server cannot tell us its threshold; matches the backend default */
const FALLBACK_THRESHOLD = 5;

type StockState = 'out' | 'low' | 'ok';

/** A product of my store; the list API always sends the stock */
type Item = ProductCard & { stock: number };

@Component({
  selector: 'app-seller-inventory',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <header>
      <p class="text-sm text-text-muted">Panel de gestión</p>
      <h1 class="text-2xl font-display font-bold text-text-main mt-1">Inventario</h1>
      <p class="text-text-muted mt-1 max-w-xl text-sm">
        Ajusta el stock de tus productos. Te avisamos cuando queden
        <strong class="text-text-main">{{ threshold() }}</strong> unidades o menos.
      </p>
    </header>

    <div *ngIf="!auth.canManageStore()"
         class="rounded-xl border border-secondary/30 bg-secondary-light px-4 py-3 text-sm text-text-main">
      Tu puesto está suspendido. Puedes ver tu inventario, pero no modificarlo.
    </div>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-3 animate-pulse" aria-busy="true" aria-label="Cargando inventario">
      <div *ngFor="let i of [1,2,3,4]" class="h-20 rounded-2xl border border-border-subtle bg-surface"></div>
    </div>

    <!-- Error -->
    <div *ngIf="!loading() && error()" role="alert"
         class="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger flex items-center justify-between gap-3 flex-wrap">
      <span>No pudimos cargar tu inventario.</span>
      <button type="button" id="inventory-retry" (click)="load()"
              class="font-semibold underline underline-offset-2">Reintentar</button>
    </div>

    <!-- Empty -->
    <div *ngIf="!loading() && !error() && products().length === 0" id="inventory-empty"
         class="rounded-2xl border border-dashed border-border-medium bg-surface px-6 py-14 text-center">
      <p class="font-display font-semibold text-text-main">Aún no tienes productos</p>
      <p class="text-sm text-text-muted mt-1">Publica tu primer producto para controlar su stock aquí.</p>
      <a *ngIf="auth.canManageStore()" routerLink="/dashboard/products/new"
         class="inline-block mt-4 text-sm font-semibold text-primary">Agregar producto</a>
    </div>

    <ng-container *ngIf="!loading() && !error() && products().length > 0">
      <!-- Low stock alert + filter -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p *ngIf="attentionCount() > 0" id="inventory-alert" role="status"
           class="rounded-xl border border-secondary/30 bg-secondary-light px-4 py-2 text-sm text-text-main">
          {{ attentionCount() }}
          {{ attentionCount() === 1 ? 'producto necesita' : 'productos necesitan' }} reposición.
        </p>
        <p *ngIf="attentionCount() === 0" class="text-sm text-text-muted">Todo tu inventario está en buen nivel.</p>

        <button type="button" id="inventory-filter" (click)="onlyLow.set(!onlyLow())"
                [attr.aria-pressed]="onlyLow()"
                class="px-3 py-1.5 text-sm font-semibold rounded-lg border transition"
                [ngClass]="onlyLow()
                  ? 'bg-primary text-white border-primary'
                  : 'border-border-subtle text-text-muted hover:text-text-main'">
          Solo stock bajo
        </button>
      </div>

      <p *ngIf="visible().length === 0" class="text-sm text-text-muted text-center py-8">
        No hay productos con stock bajo.
      </p>

      <ul class="space-y-3">
        <li *ngFor="let p of visible()" [id]="'inventory-row-' + p.id"
            class="rounded-2xl border border-border-subtle bg-surface p-4 flex flex-wrap items-center gap-4">
          <img [src]="p.image" [alt]="p.name" class="h-14 w-14 rounded-xl object-cover bg-surface-subtle" />

          <div class="min-w-0 flex-1 basis-40">
            <p class="font-semibold text-text-main truncate">{{ p.name }}</p>
            <p class="text-xs text-text-muted capitalize">{{ p.category }} · {{ p.unit }}</p>
          </div>

          <span class="text-xs font-semibold px-2.5 py-1 rounded-full border"
                [ngClass]="stateClasses(p.stock)">
            {{ stateLabel(p.stock) }}
          </span>

          <form class="flex items-center gap-2" (submit)="save(p); $event.preventDefault()">
            <label class="sr-only" [for]="'stock-' + p.id">Stock de {{ p.name }}</label>
            <input [id]="'stock-' + p.id" type="number" min="0" step="1" inputmode="numeric"
                   [value]="draftOf(p)" [disabled]="!auth.canManageStore() || saving() === p.id"
                   (input)="onInput(p, $any($event.target).value)"
                   class="w-24 rounded-lg border border-border-medium bg-surface px-3 py-1.5 text-sm text-text-main disabled:opacity-60"
                   [ngClass]="isInvalid(p) ? 'border-danger' : ''"
                   [attr.aria-invalid]="isInvalid(p)" />
            <button type="submit" [id]="'save-' + p.id"
                    [disabled]="!canSave(p)"
                    class="px-3 py-1.5 text-sm font-semibold rounded-lg bg-primary text-white disabled:opacity-40 transition">
              {{ saving() === p.id ? 'Guardando…' : 'Guardar' }}
            </button>
          </form>
        </li>
      </ul>
    </ng-container>
  </main>
  `,
})
export class SellerInventoryComponent implements OnInit {
  private productSvc = inject(ProductService);
  private sellerSvc = inject(SellerService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  products = signal<Item[]>([]);
  threshold = signal(FALLBACK_THRESHOLD);
  loading = signal(true);
  error = signal(false);
  onlyLow = signal(false);
  saving = signal<number | null>(null);
  /** Text typed in each stock input, until it is saved */
  private drafts = signal<Record<number, string>>({});

  attentionCount = computed(() => this.products().filter((p) => this.stateOf(p.stock) !== 'ok').length);

  visible = computed(() => {
    const list = this.products();
    return this.onlyLow() ? list.filter((p) => this.stateOf(p.stock) !== 'ok') : list;
  });

  ngOnInit(): void {
    this.sellerSvc.getMine().subscribe({ error: () => undefined });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      products: this.productSvc.listSeller().pipe(
        // The API answers 404 when the seller has no products yet
        catchError((err: HttpErrorResponse) => (err.status === 404 ? of([] as Item[]) : throwError(() => err)))
      ),
      settings: this.sellerSvc.getNotificationSettings().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ products, settings }) => {
        // Lowest stock first; kept while editing so rows do not jump under the cursor
        this.products.set(products.map((p): Item => ({ ...p, stock: p.stock ?? 0 })).sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)));
        this.drafts.set({});
        if (settings) this.threshold.set(settings.lowStockThreshold);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  stateOf(stock: number): StockState {
    if (stock <= 0) return 'out';
    return stock <= this.threshold() ? 'low' : 'ok';
  }

  stateLabel(stock: number): string {
    return { out: 'Agotado', low: 'Stock bajo', ok: 'En stock' }[this.stateOf(stock)];
  }

  stateClasses(stock: number): string {
    return {
      out: 'bg-danger-bg text-danger border-danger-border',
      low: 'bg-secondary-light text-text-main border-secondary/30',
      ok: 'bg-success-bg text-success border-success-border',
    }[this.stateOf(stock)];
  }

  draftOf(p: Item): string {
    return this.drafts()[p.id] ?? String(p.stock);
  }

  onInput(p: Item, value: string): void {
    this.drafts.update((d) => ({ ...d, [p.id]: value }));
  }

  /** A whole number >= 0 */
  private parsed(p: Item): number | null {
    const raw = this.draftOf(p).trim();
    if (!/^\d+$/.test(raw)) return null;
    return Number(raw);
  }

  isInvalid(p: Item): boolean {
    return this.parsed(p) === null;
  }

  canSave(p: Item): boolean {
    const value = this.parsed(p);
    return (
      this.auth.canManageStore() &&
      this.saving() === null &&
      value !== null &&
      value !== p.stock
    );
  }

  save(p: Item): void {
    const stock = this.parsed(p);
    if (!this.canSave(p) || stock === null) return;

    this.saving.set(p.id);
    this.productSvc.update(p.id, { stock }).subscribe({
      next: () => {
        this.products.update((list) => list.map((x) => (x.id === p.id ? { ...x, stock } : x)));
        this.drafts.update(({ [p.id]: _saved, ...rest }) => rest);
        this.saving.set(null);
        this.toast.success(`Stock de "${p.name}" actualizado a ${stock}`);
      },
      error: () => {
        this.saving.set(null);
        this.toast.error('No se pudo actualizar el stock. Intenta nuevamente.');
      },
    });
  }
}
