import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CheckoutComponent } from './checkout.component';
import { CartService } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

const stand = (acceptsCash: boolean, acceptsQr: boolean) => ({
  sellerId: 's', businessName: 'P', location: null, acceptsCash, acceptsQr, items: [], subtotal: 0,
});

describe('CheckoutComponent', () => {
  let groups: ReturnType<typeof stand>[];
  let fixture: ComponentFixture<CheckoutComponent>;
  let component: CheckoutComponent;
  let checkout: jasmine.Spy;

  beforeEach(() => {
    groups = [stand(true, true)];
    checkout = jasmine.createSpy('checkout').and.returnValue(
      of({ checkoutId: 'c-1', orders: [{ id: 7, sellerId: 's1', total: '10.00' }, { id: 8, sellerId: 's2', total: '5.00' }] })
    );
    TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideRouter([]),
        { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
        { provide: CartService, useValue: { items: () => [], groups: () => groups, total: () => 0, load: () => of({ id: 1, items: [] }), checkout } },
      ],
    });
    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
  });

  it('sends pickup without an address', () => {
    component.address.set('ignored');
    component.placeOrder();

    expect(checkout).toHaveBeenCalledOnceWith({ fulfillment: 'pickup', paymentMethod: 'cash_on_delivery' });
  });

  it('does not call the API for delivery without address or reference', () => {
    component.fulfillment.set('delivery');
    component.address.set('Calle 1');
    component.placeOrder();

    expect(checkout).not.toHaveBeenCalled();
    expect(component.submitted()).toBeTrue();
  });

  it('sends delivery with trimmed address, reference, phone and note', () => {
    component.fulfillment.set('delivery');
    component.address.set('  Calle 1 #20 ');
    component.addressRef.set(' Puerta verde ');
    component.contactPhone.set(' +591 7000 ');
    component.note.set(' Timbre ');
    component.placeOrder();

    expect(checkout).toHaveBeenCalledOnceWith({
      fulfillment: 'delivery',
      paymentMethod: 'cash_on_delivery',
      address: 'Calle 1 #20',
      addressRef: 'Puerta verde',
      contactPhone: '+591 7000',
      note: 'Timbre',
    });
  });

  it('lists every created order when the purchase is split between stands', () => {
    component.placeOrder();

    expect(component.orderIds()).toEqual([7, 8]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Orden #7');
    expect(fixture.nativeElement.textContent).toContain('Orden #8');
  });

  it('shows the API message and keeps the form when checkout fails', () => {
    checkout.and.returnValue(throwError(() => ({ error: { message: 'Insufficient stock for product 3' } })));

    component.placeOrder();

    expect(component.errorMsg()).toBe('Insufficient stock for product 3');
    expect(component.orderIds()).toEqual([]);
    expect(component.placing()).toBeFalse();
  });

  it('offers only the payment methods every stand accepts', () => {
    groups = [stand(true, true), stand(true, false)];
    expect(component.methods()).toEqual(['cash_on_delivery']);
  });

  it('sends the QR method when the buyer chooses it', () => {
    component.paymentChoice.set('qr_transfer');
    component.placeOrder();

    expect(checkout).toHaveBeenCalledOnceWith({ fulfillment: 'pickup', paymentMethod: 'qr_transfer' });
    expect(component.donePayment()).toBe('qr_transfer');
  });

  it('ignores a choice that is no longer available and falls back to the first method', () => {
    groups = [stand(true, false)];
    component.paymentChoice.set('qr_transfer');

    expect(component.method()).toBe('cash_on_delivery');
  });

  it('does not place the order when the stands share no payment method', () => {
    groups = [stand(true, false), stand(false, true)];
    component.placeOrder();

    expect(component.methods()).toEqual([]);
    expect(checkout).not.toHaveBeenCalled();
  });
});
