import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrderPayComponent } from './order-pay.component';
import { Order, OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';

const order = (o: Partial<Order> = {}): Order => ({
  id: 9, sellerId: 's1', checkoutId: 'c', status: 'pending', total: '25.50', fulfillment: 'pickup',
  address: null, addressRef: null, contactPhone: '7', note: null,
  paymentMethod: 'qr_transfer', paymentStatus: 'unpaid', paymentProofUrl: null, paymentRejectReason: null, paidAt: null,
  createdAt: '2026-11-20T10:00:00Z', items: [],
  seller: { id: 's1', businessName: 'Puesto Uno', location: null, paymentInstructions: 'Banco X 123', paymentQrUrl: null },
  ...o,
});

describe('OrderPayComponent', () => {
  let fixture: ComponentFixture<OrderPayComponent>;
  let component: OrderPayComponent;
  let uploadProof: jasmine.Spy;
  let getById: jasmine.Spy;

  function create(o: Order) {
    getById = jasmine.createSpy('getById').and.returnValue(of(o));
    uploadProof = jasmine.createSpy('uploadProof').and.returnValue(of({ ...o, paymentStatus: 'proof_uploaded', paymentProofUrl: 'https://x.com/p.jpg' }));
    TestBed.configureTestingModule({
      imports: [OrderPayComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }) } } },
        { provide: OrderService, useValue: { getById, uploadProof } },
        { provide: ToastService, useValue: { success: () => undefined, error: () => undefined } },
      ],
    });
    fixture = TestBed.createComponent(OrderPayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }
  const text = () => fixture.nativeElement.textContent as string;

  it('shows the exact amount and the stand instructions for a QR order', () => {
    create(order());

    expect(fixture.nativeElement.querySelector('#pay-amount').textContent).toContain('Bs 25.50');
    expect(text()).toContain('Banco X 123');
    expect(fixture.nativeElement.querySelector('#proof-url')).not.toBeNull();
  });

  it('shows the cash explanation and no proof form for a cash order', () => {
    create(order({ paymentMethod: 'cash_on_delivery' }));

    expect(text()).toContain('Pago contra entrega');
    expect(fixture.nativeElement.querySelector('#proof-url')).toBeNull();
  });

  it('rejects a link that is not a URL without calling the API', () => {
    create(order());
    component.url.set('comprobante');
    component.send();

    expect(uploadProof).not.toHaveBeenCalled();
    expect(component.errorMsg()).toContain('enlace');
  });

  it('uploads the proof and shows it as waiting, keeping the stand data', () => {
    create(order());
    component.url.set(' https://x.com/p.jpg ');
    component.send();
    fixture.detectChanges();

    expect(uploadProof).toHaveBeenCalledOnceWith(9, 'https://x.com/p.jpg');
    expect(component.order()!.paymentStatus).toBe('proof_uploaded');
    expect(component.order()!.seller!.businessName).toBe('Puesto Uno');
    expect(fixture.nativeElement.querySelector('#pay-waiting')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#proof-url')).toBeNull();
  });

  it('shows the rejection reason and lets the buyer upload another proof', () => {
    create(order({ paymentStatus: 'rejected', paymentRejectReason: 'El monto no coincide' }));

    expect(fixture.nativeElement.querySelector('#pay-rejected').textContent).toContain('El monto no coincide');
    expect(fixture.nativeElement.querySelector('#proof-url')).not.toBeNull();
  });

  it('shows the API message when the upload fails', () => {
    create(order());
    uploadProof.and.returnValue(throwError(() => ({ error: { message: 'Conflict: The order is cancelled' } })));
    component.url.set('https://x.com/p.jpg');
    component.send();

    expect(component.errorMsg()).toBe('Conflict: The order is cancelled');
    expect(component.sending()).toBeFalse();
  });

  it('says so when the order does not exist', () => {
    getById = jasmine.createSpy().and.returnValue(throwError(() => ({ status: 404 })));
    TestBed.configureTestingModule({
      imports: [OrderPayComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '99' }) } } },
        { provide: OrderService, useValue: { getById } },
        { provide: ToastService, useValue: {} },
      ],
    });
    fixture = TestBed.createComponent(OrderPayComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No encontramos este pedido');
  });
});
