import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Cart, CartService } from './cart.service';
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
    service.checkout().subscribe((r) => (result = r));
    const req = httpMock.expectOne(`${API}/cart/checkout`);
    expect(req.request.method).toBe('POST');
    req.flush({ ok: true, message: 'Order created', data: { id: 42, userId: 'u1', status: 'pending', total: '6.00' } });

    expect(result).toEqual({ orderId: 42 });
    expect(service.itemCount()).toBe(0);
  });

  it('keeps the local cart when the checkout fails', () => {
    service.load().subscribe();
    httpMock.expectOne(`${API}/cart`).flush({ ok: true, message: 'ok', data: cartWith({ id: 1, quantity: 2, price: 3 }) });

    service.checkout().subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${API}/cart/checkout`)
      .flush({ ok: false, message: 'Insufficient stock' }, { status: 400, statusText: 'Bad Request' });

    expect(service.itemCount()).toBe(2);
  });
});
