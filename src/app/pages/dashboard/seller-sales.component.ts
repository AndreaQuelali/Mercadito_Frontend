import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
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
  imports: [CommonModule, RouterLink, UiEmptyComponent],
  template: `
  <main class="ui-page space-y-8">
    <header class="flex flex-wrap items-end justify-between gap-5">
      <div class="space-y-3">
        <h1 class="ui-title">Ventas</h1>
        <p class="ui-lead">
          Ingresos de pedidos pagados, confirmados, en camino y entregados.
          Los pendientes y cancelados no suman.
        </p>
      </div>

      <div role="group" aria-label="Período" class="flex flex-wrap gap-2">
        <button *ngFor="let p of periods" type="button" [id]="'sales-period-' + p.key"
                (click)="select(p)" [attr.aria-pressed]="period().key === p.key"
                class="ui-chip" [class.is-active]="period().key === p.key">
          {{ p.label }}
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-4" aria-busy="true" aria-label="Cargando ventas">
      <div class="grid gap-4 sm:grid-cols-3">
        <div *ngFor="let i of [1,2,3]" class="ui-skel h-28"></div>
      </div>
      <div class="ui-skel h-56"></div>
    </div>

    <!-- Error -->
    <ui-empty *ngIf="!loading() && error()" variant="error" title="No pudimos cargar tus ventas" text="Revisa tu conexión e inténtalo de nuevo.">
      <button type="button" id="sales-retry" (click)="load()" class="ui-btn ui-btn-ghost">Reintentar</button>
    </ui-empty>

    <ng-container *ngIf="!loading() && !error() && summary() as s">
      <!-- Empty -->
      <div *ngIf="isEmpty()" id="sales-empty">
        <ui-empty icon="orders" title="Aún no hay ventas en este período" text="Cuando un pedido se confirme, verás aquí tus ingresos y tus productos más vendidos.">
          <a routerLink="/dashboard/orders" class="ui-btn ui-btn-ghost">Ver pedidos</a>
        </ui-empty>
      </div>

      <ng-container *ngIf="!isEmpty()">
        <!-- Totals -->
        <section aria-label="Resumen" class="grid gap-4 sm:grid-cols-3">
          <div class="ui-panel">
            <p class="text-text-muted">Ingresos</p>
            <p id="sales-total" class="ui-title mt-1">Bs {{ money(s.total) }}</p>
          </div>
          <div class="ui-panel">
            <p class="text-text-muted">Pedidos</p>
            <p id="sales-orders" class="ui-title mt-1">{{ s.ordersCount }}</p>
          </div>
          <div class="ui-panel">
            <p class="text-text-muted">Unidades vendidas</p>
            <p id="sales-units" class="ui-title mt-1">{{ s.unitsSold }}</p>
          </div>
        </section>

        <div class="grid gap-4 lg:grid-cols-5">
          <!-- Top products -->
          <section aria-labelledby="top-title" class="lg:col-span-3 ui-panel">
            <h2 id="top-title" class="ui-h2">Más vendidos</h2>
            <ol class="mt-5 space-y-[18px]">
              <li *ngFor="let p of s.topProducts; let i = index"
                  class="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3.5">
                <img [src]="p.image || ''" [alt]="p.name"
                     class="h-14 w-14 rounded-[var(--radius)] object-cover bg-surface-hover" />
                <div class="min-w-0">
                  <div class="truncate text-[15px] font-semibold text-text-main">{{ i + 1 }}. {{ p.name }}</div>
                  <div class="mt-2 h-2.5 overflow-hidden rounded-[var(--radius)] bg-base" aria-hidden="true">
                    <div class="h-full rounded-[var(--radius)] bg-primary" [style.width.%]="barWidth(p.units)"></div>
                  </div>
                </div>
                <div class="flex min-w-[96px] flex-col items-end">
                  <span class="text-[17px] font-bold tabular-nums text-text-main">Bs {{ money(p.revenue) }}</span>
                  <span class="text-[13px] text-text-muted">{{ p.units }} {{ p.units === 1 ? 'unidad' : 'unidades' }}</span>
                </div>
              </li>
            </ol>
          </section>

          <!-- By status -->
          <section aria-labelledby="status-title" class="lg:col-span-2 ui-panel">
            <h2 id="status-title" class="ui-h2">Pedidos por estado</h2>
            <dl class="mt-5 space-y-3">
              <div *ngFor="let st of statuses" class="flex items-center justify-between gap-3">
                <dt class="flex items-center gap-2.5">
                  <span class="rounded-[var(--radius)] px-3 py-[3px] text-sm font-semibold" [ngClass]="badgeClass(st.key)">{{ st.label }}</span>
                  <span *ngIf="!st.counts" class="text-[13px] text-text-muted">no suma</span>
                </dt>
                <dd class="text-lg font-bold">{{ s.ordersByStatus[st.key] }}</dd>
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

  /** One color per status, all with cream text; cancelled is solid red so it reads on the panel */
  badgeClass(key: SalesStatus): string {
    const onColor = 'text-[color:var(--color-text-on-primary)]';
    return {
      pending: 'bg-secondary ' + onColor,
      paid: 'bg-[color:var(--color-bg-inverse)] text-[color:var(--color-text-on-inverse)]',
      confirmed: 'bg-accent-teal ' + onColor,
      shipped: 'bg-accent-pink ' + onColor,
      delivered: 'bg-accent-green ' + onColor,
      cancelled: 'bg-danger ' + onColor,
    }[key];
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
