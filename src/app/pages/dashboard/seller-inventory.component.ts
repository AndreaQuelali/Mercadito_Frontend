import { Component, HostListener, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { ProductService } from '../../services/products.service';
import { ProductCard } from '../../components/product-card/product-card.component';
import { SellerService } from '../../services/seller.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

/** Used only if the server cannot tell us its threshold; matches the backend default */
const FALLBACK_THRESHOLD = 5;

export const PAGE_SIZES = [5, 10, 25];
const DEFAULT_PAGE_SIZE = 10;

type StockState = 'out' | 'low' | 'ok';
type StockFilter = 'all' | 'low' | 'out';
export type InventorySort = 'stock' | 'name' | 'price' | 'updated';

/** A product of my store; the list API always sends the stock */
type Item = ProductCard & { stock: number };

const CATEGORY_LABELS: Record<string, string> = {
  verduras: 'Verduras',
  frutas: 'Frutas',
  panaderia: 'Panadería',
  lacteos: 'Lácteos',
  artesanias: 'Artesanías',
};

@Component({
  selector: 'app-seller-inventory',
  standalone: true,
  imports: [CommonModule, RouterLink, UiEmptyComponent],
  template: `
  <main class="ui-page space-y-8">
    <header class="space-y-3">
      <h1 class="ui-title">Inventario</h1>
      <p class="ui-lead">
        Ajusta el stock de tus productos. Te avisamos cuando queden
        <strong class="text-text-main">{{ threshold() }}</strong> unidades o menos.
      </p>
    </header>

    <p *ngIf="!auth.canManageStore()" class="ui-alert-warn">
      Tu puesto está suspendido. Puedes ver tu inventario, pero no modificarlo.
    </p>

    <!-- Loading -->
    <div *ngIf="loading()" class="space-y-3" aria-busy="true" aria-label="Cargando inventario">
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div *ngFor="let i of [1,2,3,4]" class="ui-skel h-24"></div>
      </div>
      <div *ngFor="let i of [1,2,3,4]" class="ui-skel h-20"></div>
    </div>

    <!-- Error -->
    <ui-empty *ngIf="!loading() && error()" variant="error" title="No pudimos cargar tu inventario" text="Revisa tu conexión e inténtalo de nuevo.">
      <button type="button" id="inventory-retry" (click)="load()" class="ui-btn ui-btn-ghost">Reintentar</button>
    </ui-empty>

    <!-- Empty -->
    <div *ngIf="!loading() && !error() && products().length === 0" id="inventory-empty">
      <ui-empty icon="box" title="Aún no tienes productos" text="Publica tu primer producto para controlar su stock aquí.">
        <a *ngIf="auth.canManageStore()" routerLink="/dashboard/products/new" class="ui-btn">Agregar producto</a>
      </ui-empty>
    </div>

    <ng-container *ngIf="!loading() && !error() && products().length > 0">
      <!-- Resumen -->
      <section aria-label="Resumen del inventario" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="ui-panel !px-6 !py-5">
          <p class="font-semibold text-text-muted">Productos</p>
          <p id="inventory-stat-total" class="font-display text-[32px] font-bold leading-[1.05] tracking-tight">{{ products().length }}</p>
        </div>
        <div class="ui-panel !px-6 !py-5">
          <p class="font-semibold text-text-muted">Stock bajo</p>
          <p id="inventory-stat-low" class="font-display text-[32px] font-bold leading-[1.05] tracking-tight">{{ lowCount() }}</p>
        </div>
        <div class="ui-panel !px-6 !py-5">
          <p class="font-semibold text-text-muted">Agotados</p>
          <p id="inventory-stat-out" class="font-display text-[32px] font-bold leading-[1.05] tracking-tight">{{ outCount() }}</p>
        </div>
        <div class="ui-panel !px-6 !py-5">
          <p class="font-semibold text-text-muted">Valor del inventario</p>
          <p id="inventory-stat-value" class="font-display text-[32px] font-bold leading-[1.05] tracking-tight tabular-nums">Bs {{ stockValue() | number: '1.2-2' }}</p>
          <p class="text-[13px] text-text-muted">Stock por precio de venta</p>
        </div>
      </section>

      <!-- Buscar, filtrar y ordenar -->
      <section aria-label="Filtros" class="ui-panel space-y-4 !px-6 !py-5">
        <div role="group" aria-label="Estado del stock" class="flex flex-wrap gap-2">
          <button *ngFor="let c of chips()" type="button" [id]="'inventory-chip-' + c.key"
                  (click)="setChip(c.key)" [attr.aria-pressed]="chip() === c.key"
                  class="ui-chip on-panel" [class.is-active]="chip() === c.key">
            {{ c.label }} ({{ c.count }})
          </button>
        </div>

        <div class="grid gap-3.5 md:grid-cols-[2fr_1fr_1fr]">
          <label class="block">
            <span class="ui-label !mb-1.5">Buscar por nombre</span>
            <input id="inventory-search" type="search" class="ui-field" placeholder="Ej. papa, queso, pan"
                   [value]="query()" (input)="setQuery($any($event.target).value)" />
          </label>
          <label class="block">
            <span class="ui-label !mb-1.5">Categoría</span>
            <select id="inventory-category" class="ui-field" [value]="category()" (change)="setCategory($any($event.target).value)">
              <option value="all">Todas</option>
              <option *ngFor="let c of categories()" [value]="c.key" [selected]="category() === c.key">{{ c.label }}</option>
            </select>
          </label>
          <label class="block">
            <span class="ui-label !mb-1.5">Ordenar por</span>
            <select id="inventory-sort" class="ui-field" [value]="sort()" (change)="setSort($any($event.target).value)">
              <option value="stock" [selected]="sort() === 'stock'">Stock: menor a mayor</option>
              <option value="name" [selected]="sort() === 'name'">Nombre A–Z</option>
              <option value="price" [selected]="sort() === 'price'">Precio: mayor a menor</option>
              <option value="updated" [selected]="sort() === 'updated'">Actualizado hace poco</option>
            </select>
          </label>
        </div>

        <p id="inventory-range" class="text-[13px] text-text-muted" role="status">{{ rangeText() }}</p>
      </section>

      <!-- Lista -->
      <ul class="ui-panel space-y-2 !p-3" *ngIf="pageItems().length > 0">
        <li *ngFor="let p of pageItems(); trackBy: trackById" [id]="'inventory-row-' + p.id"
            class="relative grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 rounded-[var(--radius)] border-2 bg-base px-3.5 py-3 md:grid-cols-[56px_minmax(0,1fr)_auto]"
            [ngClass]="isDirty(p) ? 'border-primary' : 'border-transparent'">
          <img [src]="p.image" [alt]="p.name" class="h-14 w-14 rounded-[var(--radius)] bg-surface-hover object-cover" />

          <div class="min-w-0">
            <p class="truncate font-display text-lg font-bold leading-tight tracking-tight">{{ p.name }}</p>
            <p class="text-[13px] text-text-muted">{{ categoryLabel(p) }} · {{ p.unit }} · Bs {{ p.price | number: '1.2-2' }}</p>
          </div>

          <div class="col-span-full flex flex-wrap items-center gap-2.5 md:col-span-1 md:justify-end">
            <span class="rounded-[var(--radius)] px-3 py-[3px] text-sm font-semibold" [ngClass]="stateClasses(p.stock)">
              {{ stateLabel(p.stock) }}
            </span>

            <div role="group" [attr.aria-label]="'Stock de ' + p.name"
                 class="inline-flex overflow-hidden rounded-[var(--radius)] border-2 bg-surface"
                 [ngClass]="isInvalid(p) ? 'border-danger' : isDirty(p) ? 'border-primary' : 'border-border-medium'">
              <button type="button" [id]="'minus-' + p.id" [attr.aria-label]="'Quitar una unidad a ' + p.name"
                      [disabled]="!auth.canManageStore() || saving() === p.id || shownValue(p) <= 0"
                      (click)="step(p, -1)"
                      class="min-h-[44px] w-11 text-[22px] font-semibold transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-35">−</button>
              <input [id]="'stock-' + p.id" type="number" min="0" step="1" inputmode="numeric"
                     [value]="draftOf(p)" [disabled]="!auth.canManageStore() || saving() === p.id"
                     (input)="onInput(p, $any($event.target).value)"
                     [attr.aria-label]="'Unidades de ' + p.name" [attr.aria-invalid]="isInvalid(p)"
                     class="min-h-[44px] w-16 border-0 bg-transparent text-center text-[16px] font-semibold text-text-main outline-none disabled:opacity-60" />
              <button type="button" [id]="'plus-' + p.id" [attr.aria-label]="'Agregar una unidad a ' + p.name"
                      [disabled]="!auth.canManageStore() || saving() === p.id"
                      (click)="step(p, 1)"
                      class="min-h-[44px] w-11 text-[22px] font-semibold transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-35">+</button>
            </div>

            <button type="button" [id]="'save-' + p.id" [disabled]="!canSave(p)" (click)="save(p)" class="ui-btn ui-btn-sm !text-sm">
              {{ saving() === p.id ? 'Guardando…' : 'Guardar' }}
            </button>

            <div class="relative">
              <button type="button" [id]="'inventory-menu-' + p.id"
                      [attr.aria-label]="'Más acciones de ' + p.name" aria-haspopup="menu"
                      [attr.aria-expanded]="menuOpen() === p.id"
                      (click)="toggleMenu(p.id, $event)"
                      class="grid h-11 w-11 place-items-center rounded-[var(--radius)] border-2 border-border-medium transition hover:bg-surface-hover">
                <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
              <div *ngIf="menuOpen() === p.id" role="menu"
                   class="absolute right-0 top-12 z-10 w-52 rounded-[var(--radius)] border border-border-subtle bg-surface p-1.5 shadow-[0_12px_36px_rgba(28,22,19,0.12)]">
                <a role="menuitem" [routerLink]="['/dashboard/products/edit', p.id]"
                   class="flex min-h-[44px] items-center rounded-[var(--radius)] px-3 font-medium text-text-main no-underline hover:bg-surface-hover">Editar producto</a>
                <a role="menuitem" [routerLink]="['/product', p.id]"
                   class="flex min-h-[44px] items-center rounded-[var(--radius)] px-3 font-medium text-text-main no-underline hover:bg-surface-hover">Ver en tienda</a>
              </div>
            </div>
          </div>
        </li>
      </ul>

      <!-- Sin resultados de los filtros -->
      <div *ngIf="filtered().length === 0" id="inventory-no-results">
        <ui-empty variant="no-results" title="No hay productos con esos filtros" text="Prueba con otro nombre, otra categoría u otro estado de stock.">
          <button type="button" id="inventory-clear" (click)="clearFilters()" class="ui-btn ui-btn-ghost">Limpiar filtros</button>
        </ui-empty>
      </div>

      <!-- Paginación -->
      <nav *ngIf="filtered().length > 0" id="inventory-pager" aria-label="Paginación del inventario"
           class="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
        <label class="flex items-center gap-2.5 text-sm text-text-muted">
          Filas por página
          <select id="inventory-page-size" class="ui-field !min-h-[44px] !w-auto !px-3 !text-sm" [value]="pageSize()"
                  (change)="setPageSize($any($event.target).value)">
            <option *ngFor="let n of pageSizes" [value]="n" [selected]="pageSize() === n">{{ n }}</option>
          </select>
        </label>

        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" id="inventory-prev" aria-label="Página anterior" [disabled]="currentPage() <= 1"
                  (click)="goTo(currentPage() - 1)" class="ui-btn ui-btn-ghost ui-btn-sm !px-3.5 !text-sm">‹ Anterior</button>
          <ng-container *ngFor="let n of pageNumbers()">
            <button *ngIf="n > 0" type="button" [attr.aria-label]="'Página ' + n"
                    [attr.aria-current]="n === currentPage() ? 'page' : null" (click)="goTo(n)"
                    class="ui-btn ui-btn-sm !min-w-[44px] !px-2 !text-sm"
                    [ngClass]="n === currentPage() ? '' : 'ui-btn-ghost'">{{ n }}</button>
            <span *ngIf="n === 0" aria-hidden="true" class="grid min-h-[44px] min-w-[28px] place-items-center text-text-muted">…</span>
          </ng-container>
          <button type="button" id="inventory-next" aria-label="Página siguiente" [disabled]="currentPage() >= pageCount()"
                  (click)="goTo(currentPage() + 1)" class="ui-btn ui-btn-ghost ui-btn-sm !px-3.5 !text-sm">Siguiente ›</button>
        </div>
      </nav>

      <p class="text-[13px] text-text-muted">
        Con un cambio sin guardar la fila se marca con borde terracota y Guardar queda disponible.
        Los cambios sin guardar se conservan al cambiar de página.
      </p>
    </ng-container>
  </main>
  `,
})
export class SellerInventoryComponent implements OnInit {
  private productSvc = inject(ProductService);
  private sellerSvc = inject(SellerService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  readonly pageSizes = PAGE_SIZES;

  products = signal<Item[]>([]);
  threshold = signal(FALLBACK_THRESHOLD);
  loading = signal(true);
  error = signal(false);
  saving = signal<number | null>(null);

  chip = signal<StockFilter>('all');
  query = signal('');
  category = signal('all');
  sort = signal<InventorySort>('stock');
  page = signal(1);
  pageSize = signal(DEFAULT_PAGE_SIZE);
  menuOpen = signal<number | null>(null);

  /** Text typed in each stock input, until it is saved */
  private drafts = signal<Record<number, string>>({});

  lowCount = computed(() => this.products().filter((p) => this.stateOf(p.stock) === 'low').length);
  outCount = computed(() => this.products().filter((p) => this.stateOf(p.stock) === 'out').length);
  stockValue = computed(() => this.products().reduce((sum, p) => sum + p.stock * p.price, 0));

  chips = computed(() => [
    { key: 'all' as StockFilter, label: 'Todos', count: this.products().length },
    { key: 'low' as StockFilter, label: 'Stock bajo', count: this.lowCount() },
    { key: 'out' as StockFilter, label: 'Agotados', count: this.outCount() },
  ]);

  categories = computed(() => {
    const keys = [...new Set(this.products().map((p) => p.category ?? '').filter(Boolean))];
    return keys
      .map((key) => ({ key, label: CATEGORY_LABELS[key] ?? key }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const chip = this.chip();
    const category = this.category();
    const list = this.products().filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (category !== 'all' && p.category !== category) return false;
      const state = this.stateOf(p.stock);
      if (chip === 'low' && state !== 'low') return false;
      if (chip === 'out' && state !== 'out') return false;
      return true;
    });
    return [...list].sort(this.comparator(this.sort()));
  });

  pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  pageItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  /** 0 stands for a gap ("…") */
  pageNumbers = computed(() => {
    const total = this.pageCount();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const nums: number[] = [1];
    if (current > 3) nums.push(0);
    for (let n = Math.max(2, current - 1); n <= Math.min(total - 1, current + 1); n++) nums.push(n);
    if (current < total - 2) nums.push(0);
    nums.push(total);
    return nums;
  });

  rangeText = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return 'Sin resultados';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = start + this.pageItems().length - 1;
    const all = this.products().length;
    return `Mostrando ${start}–${end} de ${total} productos${total !== all ? ` (filtrados de ${all})` : ''}`;
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
        this.products.set(products.map((p): Item => ({ ...p, stock: p.stock ?? 0 })));
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

  // ---------- Filters, sort and pages ----------

  setChip(key: StockFilter): void {
    this.chip.set(key);
    this.resetView();
  }

  setQuery(value: string): void {
    this.query.set(value);
    this.resetView();
  }

  setCategory(value: string): void {
    this.category.set(value);
    this.resetView();
  }

  setSort(value: string): void {
    this.sort.set(value as InventorySort);
    this.resetView();
  }

  clearFilters(): void {
    this.query.set('');
    this.chip.set('all');
    this.category.set('all');
    this.resetView();
  }

  setPageSize(value: string): void {
    this.pageSize.set(PAGE_SIZES.includes(Number(value)) ? Number(value) : DEFAULT_PAGE_SIZE);
    this.resetView();
  }

  goTo(n: number): void {
    this.page.set(Math.min(Math.max(1, n), this.pageCount()));
    this.menuOpen.set(null);
  }

  /** Any change of the list starts again at the first page */
  private resetView(): void {
    this.page.set(1);
    this.menuOpen.set(null);
  }

  private comparator(sort: InventorySort): (a: Item, b: Item) => number {
    switch (sort) {
      case 'name':
        return (a, b) => a.name.localeCompare(b.name);
      case 'price':
        return (a, b) => b.price - a.price || a.name.localeCompare(b.name);
      case 'updated':
        // Newest first; without a date the highest id (the newest product) goes first
        return (a, b) => this.timeOf(b) - this.timeOf(a) || b.id - a.id;
      default:
        return (a, b) => a.stock - b.stock || a.name.localeCompare(b.name);
    }
  }

  private timeOf(p: Item): number {
    const t = p.updatedAt ? Date.parse(p.updatedAt) : NaN;
    return Number.isNaN(t) ? 0 : t;
  }

  trackById(_: number, p: Item): number {
    return p.id;
  }

  // ---------- Row menu ----------

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeMenu(): void {
    if (this.menuOpen() !== null) this.menuOpen.set(null);
  }

  // ---------- Stock state ----------

  stateOf(stock: number): StockState {
    if (stock <= 0) return 'out';
    return stock <= this.threshold() ? 'low' : 'ok';
  }

  stateLabel(stock: number): string {
    return { out: 'Agotado', low: 'Stock bajo', ok: 'En stock' }[this.stateOf(stock)];
  }

  /** Cream text on every badge but "Stock bajo", whose maize needs dark text to be readable */
  stateClasses(stock: number): string {
    return {
      out: 'bg-danger text-[color:var(--color-text-on-primary)]',
      low: 'bg-secondary text-[color:var(--color-text-on-secondary)]',
      ok: 'bg-accent-green text-[color:var(--color-text-on-primary)]',
    }[this.stateOf(stock)];
  }

  categoryLabel(p: Item): string {
    return CATEGORY_LABELS[p.category ?? ''] ?? p.category ?? '';
  }

  // ---------- Editing ----------

  draftOf(p: Item): string {
    return this.drafts()[p.id] ?? String(p.stock);
  }

  /** The number the stepper works from: the draft if it is valid, else the saved stock */
  shownValue(p: Item): number {
    return this.parsed(p) ?? p.stock;
  }

  onInput(p: Item, value: string): void {
    this.drafts.update((d) => ({ ...d, [p.id]: value }));
  }

  step(p: Item, delta: number): void {
    const next = Math.max(0, this.shownValue(p) + delta);
    this.drafts.update((d) => ({ ...d, [p.id]: String(next) }));
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

  isDirty(p: Item): boolean {
    const value = this.parsed(p);
    return value !== null && value !== p.stock;
  }

  canSave(p: Item): boolean {
    return this.auth.canManageStore() && this.saving() === null && this.isDirty(p);
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
