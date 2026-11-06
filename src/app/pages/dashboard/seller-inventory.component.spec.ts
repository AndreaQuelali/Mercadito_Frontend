import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { SellerInventoryComponent } from './seller-inventory.component';
import { ProductService } from '../../services/products.service';
import { SellerService } from '../../services/seller.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import type { ProductCard } from '../../components/product-card/product-card.component';

const CATEGORIES = ['verduras', 'frutas', 'lacteos', 'panaderia'];

/** 12 products: ids 1-12. Stock 0 for id 1, 3 for id 2, 4 for id 3, the rest 10 + id */
function products(): ProductCard[] {
  return Array.from({ length: 12 }, (_, i) => {
    const id = i + 1;
    const stock = id === 1 ? 0 : id === 2 ? 3 : id === 3 ? 4 : 10 + id;
    return {
      id,
      name: `Producto ${String(id).padStart(2, '0')}`,
      description: '',
      price: id * 2,
      unit: 'kilogramo',
      stock,
      category: CATEGORIES[id % CATEGORIES.length],
      image: `https://example.com/${id}.jpg`,
      updatedAt: new Date(2026, 9, id).toISOString(),
    };
  });
}

describe('SellerInventoryComponent', () => {
  let fixture: ComponentFixture<SellerInventoryComponent>;
  let el: HTMLElement;
  let update: jasmine.Spy;

  const q = <T extends HTMLElement = HTMLElement>(selector: string) => el.querySelector<T>(selector);
  const rows = () => Array.from(el.querySelectorAll<HTMLElement>('[id^="inventory-row-"]'));
  const rowNames = () => rows().map((r) => r.querySelector('p')!.textContent!.trim());
  const text = (selector: string) => q(selector)!.textContent!.replace(/\s+/g, ' ').trim();

  function type(selector: string, value: string, event = 'input') {
    const field = q<HTMLInputElement | HTMLSelectElement>(selector)!;
    field.value = value;
    field.dispatchEvent(new Event(event));
    fixture.detectChanges();
  }

  function click(selector: string) {
    q(selector)!.click();
    fixture.detectChanges();
  }

  function setup(opts: { items?: ProductCard[]; canManage?: boolean } = {}) {
    update = jasmine.createSpy('update').and.callFake(() => of({}));
    TestBed.configureTestingModule({
      imports: [SellerInventoryComponent, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: { listSeller: () => of(opts.items ?? products()), update } },
        {
          provide: SellerService,
          useValue: {
            getMine: () => of({}),
            getNotificationSettings: () => of({ preferences: {}, lowStockThreshold: 5 }),
          },
        },
        { provide: AuthService, useValue: { canManageStore: () => opts.canManage ?? true } },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    });
    fixture = TestBed.createComponent(SellerInventoryComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
  }

  describe('summary', () => {
    beforeEach(() => setup());

    it('counts products, low stock and sold out, and values the stock', () => {
      expect(text('#inventory-stat-total')).toBe('12');
      expect(text('#inventory-stat-low')).toBe('2'); // ids 2 and 3
      expect(text('#inventory-stat-out')).toBe('1'); // id 1
      // sum of stock * price: id 2: 3*4, id 3: 4*6, others (10 + id) * 2id
      const expected = products().reduce((sum, p) => sum + (p.stock ?? 0) * p.price, 0);
      expect(text('#inventory-stat-value')).toContain(expected.toLocaleString('en-US', { minimumFractionDigits: 2 }));
    });

    it('shows the state of each product with its own label', () => {
      const labels = rows().slice(0, 3).map((r) => r.querySelector('span.font-semibold')!.textContent!.trim());
      expect(labels).toEqual(['Agotado', 'Stock bajo', 'Stock bajo']); // lowest stock first
    });
  });

  describe('filters and sort', () => {
    beforeEach(() => setup({ items: products() }));

    it('the chips filter by stock state and show their counters', () => {
      expect(text('#inventory-chip-all')).toBe('Todos (12)');
      expect(text('#inventory-chip-low')).toBe('Stock bajo (2)');
      expect(text('#inventory-chip-out')).toBe('Agotados (1)');

      click('#inventory-chip-low');
      expect(rowNames()).toEqual(['Producto 02', 'Producto 03']);
      expect(q('#inventory-chip-low')!.getAttribute('aria-pressed')).toBe('true');

      click('#inventory-chip-out');
      expect(rowNames()).toEqual(['Producto 01']);
    });

    it('searches by name, ignoring case', () => {
      type('#inventory-search', 'PRODUCTO 07');
      expect(rowNames()).toEqual(['Producto 07']);
      expect(text('#inventory-range')).toContain('filtrados de 12');
    });

    it('filters by category and offers only the categories the seller has', () => {
      const options = Array.from(q<HTMLSelectElement>('#inventory-category')!.options).map((o) => o.textContent!.trim());
      expect(options).toEqual(['Todas', 'Frutas', 'Lácteos', 'Panadería', 'Verduras']);

      type('#inventory-category', 'lacteos', 'change');
      expect(rows().length).toBeGreaterThan(0);
      for (const r of rows()) expect(r.textContent).toContain('Lácteos');
    });

    it('sorts by name, price and last update', () => {
      type('#inventory-sort', 'name', 'change');
      expect(rowNames()[0]).toBe('Producto 01');

      type('#inventory-sort', 'price', 'change');
      expect(rowNames()[0]).toBe('Producto 12'); // the most expensive

      type('#inventory-sort', 'updated', 'change');
      expect(rowNames()[0]).toBe('Producto 12'); // updated last
    });

    it('shows a way out when nothing matches and "Limpiar filtros" restores the list', () => {
      type('#inventory-search', 'no existe');
      expect(rows().length).toBe(0);
      expect(q('#inventory-no-results')).not.toBeNull();
      expect(q('#inventory-pager')).toBeNull();

      click('#inventory-clear');
      expect(q('#inventory-no-results')).toBeNull();
      expect(rows().length).toBe(10);
    });
  });

  describe('pagination', () => {
    beforeEach(() => setup());

    it('shows 10 rows per page by default and says which ones', () => {
      expect(rows().length).toBe(10);
      expect(text('#inventory-range')).toBe('Mostrando 1–10 de 12 productos');
    });

    it('moves between pages with Siguiente and Anterior, which stop at the ends', () => {
      expect(q<HTMLButtonElement>('#inventory-prev')!.disabled).toBeTrue();

      click('#inventory-next');
      expect(rows().length).toBe(2);
      expect(text('#inventory-range')).toBe('Mostrando 11–12 de 12 productos');
      expect(q<HTMLButtonElement>('#inventory-next')!.disabled).toBeTrue();

      click('#inventory-prev');
      expect(rows().length).toBe(10);
    });

    it('marks the current page and jumps with the numbers', () => {
      const current = () => q('#inventory-pager [aria-current="page"]')!.textContent!.trim();
      expect(current()).toBe('1');
      q<HTMLButtonElement>('#inventory-pager button[aria-label="Página 2"]')!.click();
      fixture.detectChanges();
      expect(current()).toBe('2');
    });

    it('changes the page size and starts again at the first page', () => {
      click('#inventory-next');
      type('#inventory-page-size', '5', 'change');
      expect(rows().length).toBe(5);
      expect(text('#inventory-range')).toBe('Mostrando 1–5 de 12 productos');

      type('#inventory-page-size', '25', 'change');
      expect(rows().length).toBe(12);
    });

    it('a new filter goes back to the first page', () => {
      click('#inventory-next');
      type('#inventory-search', 'producto');
      expect(text('#inventory-range')).toContain('Mostrando 1–10');
    });
  });

  describe('editing the stock', () => {
    beforeEach(() => setup());

    const isDirty = (id: number) => q(`#inventory-row-${id}`)!.classList.contains('border-primary');
    const input = (id: number) => q<HTMLInputElement>(`#stock-${id}`)!;
    const save = (id: number) => q<HTMLButtonElement>(`#save-${id}`)!;

    it('starts clean: Guardar is disabled and the row has no mark', () => {
      expect(save(5).disabled).toBeTrue();
      expect(isDirty(5)).toBeFalse();
    });

    it('the plus and minus buttons change the number, mark the row and enable Guardar', () => {
      const before = Number(input(5).value);
      click('#plus-5');
      expect(Number(input(5).value)).toBe(before + 1);
      expect(isDirty(5)).toBeTrue();
      expect(save(5).disabled).toBeFalse();

      click('#minus-5');
      expect(Number(input(5).value)).toBe(before);
      expect(isDirty(5)).toBeFalse();
      expect(save(5).disabled).toBeTrue();
    });

    it('the minus button stops at zero', () => {
      expect(input(1).value).toBe('0');
      expect(q<HTMLButtonElement>('#minus-1')!.disabled).toBeTrue();
    });

    it('an invalid number cannot be saved', () => {
      type('#stock-5', '-3');
      expect(save(5).disabled).toBeTrue();
      type('#stock-5', '');
      expect(save(5).disabled).toBeTrue();
    });

    it('saves the new stock, clears the mark and refreshes the counters', () => {
      click('#plus-1');
      expect(input(1).value).toBe('1');
      click('#save-1');

      expect(update).toHaveBeenCalledOnceWith(1, { stock: 1 });
      expect(isDirty(1)).toBeFalse();
      expect(text('#inventory-stat-out')).toBe('0');
    });

    it('keeps an unsaved change when the page changes', () => {
      click('#plus-5');
      const typed = input(5).value;
      click('#inventory-next');
      click('#inventory-prev');
      expect(input(5).value).toBe(typed);
      expect(isDirty(5)).toBeTrue();
    });
  });

  describe('row menu', () => {
    beforeEach(() => setup());

    it('opens with the two actions and closes with Esc', () => {
      expect(q('#inventory-row-5 [role="menu"]')).toBeNull();
      click('#inventory-menu-5');

      const links = Array.from(el.querySelectorAll<HTMLAnchorElement>('#inventory-row-5 [role="menuitem"]'));
      expect(links.map((a) => a.textContent!.trim())).toEqual(['Editar producto', 'Ver en tienda']);
      expect(links.map((a) => a.getAttribute('href'))).toEqual(['/dashboard/products/edit/5', '/product/5']);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(q('#inventory-row-5 [role="menu"]')).toBeNull();
    });
  });

  describe('states', () => {
    it('a seller with no products sees the empty state', () => {
      setup({ items: [] });
      expect(q('#inventory-empty')).not.toBeNull();
      expect(q('#inventory-pager')).toBeNull();
    });

    it('a suspended store can read but not edit', () => {
      setup({ canManage: false });
      expect(input5Disabled()).toBeTrue();
      function input5Disabled() {
        return q<HTMLInputElement>('#stock-5')!.disabled && q<HTMLButtonElement>('#plus-5')!.disabled;
      }
    });
  });
});
