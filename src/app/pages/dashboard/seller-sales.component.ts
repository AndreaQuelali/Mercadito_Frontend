import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SalesStatus, SalesSummary, SellerService } from '../../services/seller.service';

interface Period {
  key: '7d' | '30d' | '90d' | 'all';
  label: string;
  /** Days back from today (inclusive); null = all time */
  days: number | null;
}

const PERIODS: Period[] = [
  { key: '7d', label: '7 días', days: 7 },
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
  { key: 'all', label: 'Todo', days: null },
];

const STATUS_ORDER: { key: SalesStatus; label: string; counts: boolean }[] = [
  { key: 'pending', label: 'Pendientes', counts: false },
  { key: 'paid', label: 'Pagados', counts: true },
  { key: 'confirmed', label: 'Confirmados', counts: true },
  { key: 'shipped', label: 'En camino', counts: true },
  { key: 'delivered', label: 'Entregados', counts: true },
  { key: 'cancelled', label: 'Cancelados', counts: false },
];

@Component({
  selector: 'app-seller-sales',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm text-text-muted">Panel de gestión</p>
        <h1 class="text-2xl font-display font-bold text-text-main mt-1">Ventas</h1>
        <p class="text-text-muted mt-1 max-w-xl text-sm">
          Ingresos de pedidos pagados, confirmados, en camino y entregados.
          Los pendientes y cancelados no suman.
        </p>
      </div>

      <div role="group" aria-label="Período" class="inline-flex rounded-xl border border-border-subtle bg-surface p-1">
        <button *ngFor="let p of periods" type="button" [id]="'sales-period-' + p.key"
                (click)="select(p)" [attr.aria-pressed]="period().key === p.key"
                class="px-3 py-1.5 text-sm font-semibold rounded-lg transition"
                [ngClass]="period().key === p.key
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text-main'">
          {{ p.label }}
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-4 animate-pulse" aria-busy="true" aria-label="Cargando ventas">
      <div class="grid gap-4 sm:grid-cols-3">
        <div *ngFor="let i of [1,2,3]" class="h-24 rounded-2xl border border-border-subtle bg-surface"></div>
      </div>
      <div class="h-56 rounded-2xl border border-border-subtle bg-surface"></div>
    </div>

    <!-- Error -->
    <div *ngIf="!loading() && error()" role="alert"
         class="rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger flex items-center justify-between gap-3 flex-wrap">
      <span>No pudimos cargar tus ventas.</span>
      <button type="button" id="sales-retry" (click)="load()"
              class="font-semibold underline underline-offset-2">Reintentar</button>
    </div>

    <ng-container *ngIf="!loading() && !error() && summary() as s">
      <!-- Empty -->
      <div *ngIf="isEmpty()" id="sales-empty"
           class="rounded-2xl border border-dashed border-border-medium bg-surface px-6 py-14 text-center">
        <p class="font-display font-semibold text-text-main">Aún no hay ventas en este período</p>
        <p class="text-sm text-text-muted mt-1">
          Cuando un pedido se confirme, verás aquí tus ingresos y tus productos más vendidos.
        </p>
        <a routerLink="/dashboard/orders" class="inline-block mt-4 text-sm font-semibold text-primary">Ver pedidos</a>
      </div>

      <ng-container *ngIf="!isEmpty()">
        <!-- Totals -->
        <section aria-label="Resumen" class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-2xl border border-border-subtle bg-surface p-5">
            <p class="text-sm text-text-muted">Ingresos</p>
            <p id="sales-total" class="mt-1 text-2xl font-display font-bold text-text-main">Bs {{ money(s.total) }}</p>
          </div>
          <div class="rounded-2xl border border-border-subtle bg-surface p-5">
            <p class="text-sm text-text-muted">Pedidos</p>
            <p id="sales-orders" class="mt-1 text-2xl font-display font-bold text-text-main">{{ s.ordersCount }}</p>
          </div>
          <div class="rounded-2xl border border-border-subtle bg-surface p-5">
            <p class="text-sm text-text-muted">Unidades vendidas</p>
            <p id="sales-units" class="mt-1 text-2xl font-display font-bold text-text-main">{{ s.unitsSold }}</p>
          </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-5">
          <!-- Top products -->
          <section aria-labelledby="top-title" class="lg:col-span-3 rounded-2xl border border-border-subtle bg-surface p-5">
            <h2 id="top-title" class="font-display font-semibold text-text-main">Más vendidos</h2>
            <ol class="mt-4 space-y-4">
              <li *ngFor="let p of s.topProducts; let i = index">
                <div class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="text-text-main font-medium truncate">
                    <span class="text-text-subtle mr-1">{{ i + 1 }}.</span>{{ p.name }}
                  </span>
                  <span class="text-text-muted shrink-0">
                    {{ p.units }} {{ p.units === 1 ? 'unidad' : 'unidades' }} · Bs {{ money(p.revenue) }}
                  </span>
                </div>
                <div class="mt-1.5 h-2 rounded-full bg-surface-subtle overflow-hidden" aria-hidden="true">
                  <div class="h-full rounded-full bg-primary" [style.width.%]="barWidth(p.units)"></div>
                </div>
              </li>
            </ol>
          </section>

          <!-- By status -->
          <section aria-labelledby="status-title" class="lg:col-span-2 rounded-2xl border border-border-subtle bg-surface p-5">
            <h2 id="status-title" class="font-display font-semibold text-text-main">Pedidos por estado</h2>
            <dl class="mt-4 space-y-2 text-sm">
              <div *ngFor="let st of statuses" class="flex items-center justify-between">
                <dt class="text-text-muted">
                  {{ st.label }}
                  <span *ngIf="!st.counts" class="text-text-subtle text-xs">(no suma)</span>
                </dt>
                <dd class="font-semibold text-text-main">{{ s.ordersByStatus[st.key] }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </ng-container>
    </ng-container>
  </main>
  `,
})
export class SellerSalesComponent implements OnInit {
  private sellerSvc = inject(SellerService);

  readonly periods = PERIODS;
  readonly statuses = STATUS_ORDER;

  period = signal<Period>(PERIODS[1]);
  summary = signal<SalesSummary | null>(null);
  loading = signal(true);
  error = signal(false);

  /** No counted sales and nothing else to show for the period */
  isEmpty = computed(() => {
    const s = this.summary();
    return !!s && s.ordersCount === 0 && s.topProducts.length === 0;
  });

  private maxUnits = computed(() =>
    Math.max(1, ...(this.summary()?.topProducts.map((p) => p.units) ?? [1]))
  );

  /** Ignores a slow response that arrives after the user picked another period */
  private requestId = 0;

  ngOnInit(): void {
    this.load();
  }

  select(period: Period): void {
    if (this.period().key === period.key) return;
    this.period.set(period);
    this.load();
  }

  load(): void {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set(false);

    this.sellerSvc.getSales(this.rangeFor(this.period())).subscribe({
      next: (summary) => {
        if (id !== this.requestId) return;
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        if (id !== this.requestId) return;
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  money(value: string): string {
    return Number(value).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  barWidth(units: number): number {
    return Math.max(4, Math.round((units / this.maxUnits()) * 100));
  }

  /** The last N days, counting today, from local midnight (so days match the seller's timezone) */
  private rangeFor(period: Period): { from?: Date } {
    if (period.days === null) return {};
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (period.days - 1));
    return { from };
  }
}
