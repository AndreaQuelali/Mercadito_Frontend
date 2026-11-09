import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Cart, CartService, commonPaymentMethods, groupBySeller } from './cart.service';
import { environment } from '../../environments/environment';

const API = environment.apiUrl;

const product = (id: number, price: number) => ({
  id,
  name: `Producto ${id}`,
  price,
  unit: 'kilogramo',
  image: 'https://example.com/p.jpg',
  stock: 10,
});

const cartWith = (...items: { id: number; quantity: number; price: number }[]): Cart => ({
  id: 1,
  items: items.map((i) => ({ id: i.id, quantity: i.quantity, product: product(i.id, i.price) })),
});

describe('CartService', () => {
  let service: CartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('starts empty', () => {
    expect(service.items()).toEqual([]);
    expect(service.itemCount()).toBe(0);
    expect(service.total()).toBe(0);
  });

  it('loads the cart and derives the count and the total', () => {
    service.load().subscribe();
    httpMock
      .expectOne(`${API}/cart`)
      .flush({ ok: true, message: 'Cart fetched', data: cartWith({ id: 1, quantity: 2, price: 10.5 }, { id: 2, quantity: 3, price: 4 }) });

    expect(service.items().length).toBe(2);
    expect(service.itemCount()).toBe(5); // units, not lines
    expect(service.total()).toBe(2 * 10.5 + 3 * 4);
  });

  it('treats the empty cart answer as no items', () => {
    service.load().subscribe();
    httpMock.expectOne(`${API}/cart`).flush({ ok: true, message: 'Cart is empty', data: { items: [] } });

    expect(service.itemCount()).toBe(0);
    expect(service.total()).toBe(0);
  });

  it('adds one unit by default and replaces the cart with the server answer', () => {
    service.addItem(7).subscribe();

    const req = httpMock.expectOne(`${API}/cart/add`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ productId: 7, quantity: 1 });
    req.flush({ ok: true, message: 'Added to cart', data: cartWith({ id: 1, quantity: 1, price: 5 }) });

    expect(service.itemCount()).toBe(1);
  });

  it('adds the requested quantity', () => {
    service.addItem(7, 4).subscribe();

    const req = httpMock.expectOne(`${API}/cart/add`);
    expect(req.request.body).toEqual({ productId: 7, quantity: 4 });
    req.flush({ ok: true, message: 'ok', data: cartWith({ id: 1, quantity: 4, price: 5 }) });

    expect(service.itemCount()).toBe(4);
    expect(service.total()).toBe(20);
  });

  it('changes the quantity of an item', () => {
    service.updateItem(3, 6).subscribe();

    const req = httpMock.expectOne(`${API}/cart/item/3`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ quantity: 6 });
    req.flush({ ok: true, message: 'ok', data: cartWith({ id: 3, quantity: 6, price: 2 }) });

    expect(service.itemCount()).toBe(6);
  });

  it('removes an item', () => {
    service.removeItem(3).subscribe();

    const req = httpMock.expectOne(`${API}/cart/item/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true, message: 'ok', data: { id: 1, items: [] } });

    expect(service.items()).toEqual([]);
  });

  it('empties the cart locally after clearing it on the server', () => {
    service.load().subscribe();
    httpMock.expectOne(`${API}/cart`).flush({ ok: true, message: 'ok', data: cartWith({ id: 1, quantity: 2, price: 3 }) });
    expect(service.itemCount()).toBe(2);

    service.clear().subscribe();
    const req = httpMock.expectOne(`${API}/cart`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ ok: true, message: 'Cart cleared', data: null });

    expect(service.itemCount()).toBe(0);
    expect(service.total()).toBe(0);
  });

  it('empties the local cart after a successful checkout', () => {
    service.load().subscribe();
    httpMock.expectOne(`${API}/cart`).flush({ ok: true, message: 'ok', data: cartWith({ id: 1, quantity: 2, price: 3 }) });

    let result: unknown;
    service.checkout({ fulfillment: 'pickup' }).subscribe((r) => (result = r));
    const req = httpMock.expectOne(`${API}/cart/checkout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fulfillment: 'pickup' });
    const data = { checkoutId: 'c-1', orders: [{ id: 42, sellerId: 's1', total: '6.00' }] };
    req.flush({ ok: true, message: 'Order created', data });

    expect(result).toEqual(data);
    expect(service.itemCount()).toBe(0);
  });

  it('sends the delivery data to the API', () => {
    const body = { fulfillment: 'delivery' as const, address: 'Calle 1', addressRef: 'Puerta verde', note: 'Timbre' };
    service.checkout(body).subscribe();
    const req = httpMock.expectOne(`${API}/cart/checkout`);
    expect(req.request.body).toEqual(body);
    req.flush({ ok: true, message: 'ok', data: { checkoutId: 'c', orders: [] } });
  });

  it('keeps the local cart when the checkout fails', () => {
    service.load().subscribe();
    httpMock.expectOne(`${API}/cart`).flush({ ok: true, message: 'ok', data: cartWith({ id: 1, quantity: 2, price: 3 }) });

    service.checkout({ fulfillment: 'pickup' }).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API}/cart/checkout`)
      .flush({ ok: false, message: 'Insufficient stock' }, { status: 400, statusText: 'Bad Request' });

    expect(service.itemCount()).toBe(2);
  });
});

describe('groupBySeller', () => {
  const line = (id: number, price: number, quantity: number, seller?: { id: string; businessName: string; location: string | null }) => ({
    id,
    quantity,
    product: { ...product(id, price), seller },
  });
  const a = { id: 's1', businessName: 'Puesto A', location: 'Pasillo 3' };
  const b = { id: 's2', businessName: 'Puesto B', location: null };

  it('groups the lines by stand, in order of appearance, with their subtotal', () => {
    const groups = groupBySeller([line(1, 10, 2, a), line(2, 5, 1, b), line(3, 4, 3, a)]);

    expect(groups.map((g) => g.businessName)).toEqual(['Puesto A', 'Puesto B']);
    expect(groups[0].items.map((i) => i.id)).toEqual([1, 3]);
    expect(groups[0].subtotal).toBe(32);
    expect(groups[0].location).toBe('Pasillo 3');
    expect(groups[1].subtotal).toBe(5);
    expect(groups[1].location).toBeNull();
  });

  it('is empty for an empty cart', () => {
    expect(groupBySeller([])).toEqual([]);
  });

  it('exposes the groups of the loaded cart', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    const svc = TestBed.inject(CartService);
    const http = TestBed.inject(HttpTestingController);
    svc.load().subscribe();
    http.expectOne(`${API}/cart`).flush({ ok: true, message: 'ok', data: { id: 1, items: [line(1, 10, 1, a), line(2, 5, 1, b)] } });

    expect(svc.groups().length).toBe(2);
  });
});

describe('commonPaymentMethods', () => {
  const g = (acceptsCash: boolean, acceptsQr: boolean) =>
    ({ sellerId: 's', businessName: 'P', location: null, acceptsCash, acceptsQr, items: [], subtotal: 0 });

  it('offers what every stand accepts', () => {
    expect(commonPaymentMethods([g(true, true), g(true, true)])).toEqual(['cash_on_delivery', 'qr_transfer']);
    expect(commonPaymentMethods([g(true, true), g(true, false)])).toEqual(['cash_on_delivery']);
    expect(commonPaymentMethods([g(false, true), g(true, true)])).toEqual(['qr_transfer']);
  });

  it('is empty when there is no method in common, or no stands', () => {
    expect(commonPaymentMethods([g(true, false), g(false, true)])).toEqual([]);
    expect(commonPaymentMethods([])).toEqual([]);
  });

  it('treats a stand without payment data as cash only', () => {
    const groups = groupBySeller([
      { id: 1, quantity: 1, product: { id: 1, name: 'A', price: 1, unit: 'kg', image: '', stock: 1, seller: { id: 's1', businessName: 'A', location: null } } },
    ]);
    expect(commonPaymentMethods(groups)).toEqual(['cash_on_delivery']);
  });
});
