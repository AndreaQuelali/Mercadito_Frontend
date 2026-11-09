import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrdersComponent } from './orders.component';
import { Order, OrderService, Purchase } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';

const order = (o: Partial<Order> = {}): Order => ({
  id: 5, sellerId: 's1', checkoutId: 'c1', status: 'pending', total: '20.00', fulfillment: 'pickup',
  address: null, addressRef: null, contactPhone: '7', note: null,
  paymentMethod: 'cash_on_delivery', paymentStatus: 'unpaid', paymentProofUrl: null, paymentRejectReason: null, paidAt: null,
  createdAt: '2026-11-20T10:00:00Z', items: [], events: [],
  seller: { id: 's1', businessName: 'Puesto Uno', location: 'Pasillo 3' },
  ...o,
});
const purchase = (...orders: Order[]): Purchase => ({
  checkoutId: 'c1', createdAt: '2026-11-20T10:00:00Z', fulfillment: 'pickup', total: 20, orders,
});

describe('OrdersComponent — cancellation and history', () => {
  let fixture: ComponentFixture<OrdersComponent>;
  let component: OrdersComponent;
  let listMine: jasmine.Spy;
  let cancel: jasmine.Spy;
  const html = () => fixture.nativeElement as HTMLElement;

  function create(first: Purchase[]) {
    listMine = jasmine.createSpy('listMine').and.returnValue(of(first));
    cancel = jasmine.createSpy('cancel').and.returnValue(of(order({ status: 'cancelled' })));
    TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        provideRouter([]),
        { provide: OrderService, useValue: { listMine, cancel } },
        { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
      ],
    });
    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('offers cancelling for pending and paid orders only', () => {
    expect(OrdersComponentCan(order({ status: 'pending' }))).toBeTrue();
    expect(OrdersComponentCan(order({ status: 'paid' }))).toBeTrue();
    for (const status of ['confirmed', 'shipped', 'delivered', 'cancelled'] as const) {
      expect(OrdersComponentCan(order({ status }))).toBeFalse();
    }
  });

  function OrdersComponentCan(o: Order): boolean {
    TestBed.resetTestingModule();
    create([purchase(o)]);
    return !!html().querySelector('#cancel-5');
  }

  it('asks for confirmation before cancelling and sends the reason', () => {
    TestBed.resetTestingModule();
    create([purchase(order())]);

    (html().querySelector('#cancel-5') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(cancel).not.toHaveBeenCalled();
    expect(html().querySelector('#cancel-refund-note')).toBeNull();

    component.reason.set('  Me equivoqué ');
    component.cancel(component.purchases()[0].orders[0]);

    expect(cancel).toHaveBeenCalledOnceWith(5, 'Me equivoqué');
    expect(listMine).toHaveBeenCalledTimes(2); // reloaded after cancelling
    expect(component.confirming()).toBeNull();
  });

  it('warns that a paid order is not refunded automatically', () => {
    TestBed.resetTestingModule();
    create([purchase(order({ status: 'paid', paymentStatus: 'paid' }))]);

    (html().querySelector('#cancel-5') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(html().querySelector('#cancel-refund-note')!.textContent).toContain('no devuelve el dinero');
  });

  it('shows the API message when the cancellation is refused', () => {
    TestBed.resetTestingModule();
    create([purchase(order())]);
    cancel.and.returnValue(throwError(() => ({ error: { message: 'Conflict: an order that is confirmed can no longer be cancelled by the buyer' } })));

    component.cancel(component.purchases()[0].orders[0]);

    expect(component.cancelError()).toContain('no longer be cancelled');
    expect(component.cancelling()).toBeNull();
  });

  it('shows a cancelled order with its reason and its history', () => {
    TestBed.resetTestingModule();
    create([purchase(order({
      status: 'cancelled',
      events: [{ id: 1, actorRole: 'seller', from: 'pending', to: 'cancelled', reason: 'Sin stock', forced: false, createdAt: '2026-11-20T11:00:00Z' }],
    }))]);

    expect(html().querySelector('[data-cancelled="5"]')!.textContent).toContain('Sin stock');
    expect(html().querySelector('#cancel-5')).toBeNull();
    expect(html().querySelector('.order-history')!.textContent).toContain('el puesto');
  });
});
