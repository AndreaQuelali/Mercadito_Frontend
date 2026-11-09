import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { UiEmptyComponent } from '../../components/ui/ui-empty.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService, CheckoutRequest, Fulfillment, PaymentMethod, commonPaymentMethods } from '../../services/cart.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [UiEmptyComponent, CommonModule, FormsModule, RouterLink],
  template: `
  <main class="ui-page max-w-3xl">
    <div *ngIf="orderIds().length" class="space-y-6 py-8">
      <h1 class="ui-title">¡Pedido confirmado!</h1>
      <p class="ui-lead">
        {{ orderIds().length === 1 ? 'Tu pedido fue creado.' : 'Creamos un pedido por cada puesto.' }}
        {{ doneFulfillment() === 'delivery' ? 'Coordina la entrega con cada puesto.' : 'Coordina el retiro con cada puesto.' }}
      </p>
      <ul class="space-y-2">
        <li *ngFor="let id of orderIds()" class="ui-panel inline-block text-xl font-semibold mr-3">
          Orden #{{ id }}
          <a *ngIf="donePayment() === 'qr_transfer'" [routerLink]="['/orders', id, 'pay']" class="ui-btn ui-btn-sm ml-3">Pagar</a>
        </li>
      </ul>
      <p *ngIf="donePayment() === 'qr_transfer'" class="ui-lead">Paga cada pedido por QR o transferencia y sube el comprobante.</p>
      <div class="flex flex-wrap gap-3">
        <a routerLink="/orders" class="ui-btn">Ver mis pedidos</a>
        <a routerLink="/products" class="ui-btn ui-btn-ghost">Seguir comprando</a>
      </div>
    </div>

    <div *ngIf="!orderIds().length" class="space-y-8">
      <h1 class="ui-title">Confirmar pedido</h1>

      <ui-empty *ngIf="cart.items().length === 0" icon="cart" title="Tu carrito está vacío" text="Agrega productos para poder confirmar un pedido.">
        <a routerLink="/products" class="ui-btn">Explorar productos</a>
      </ui-empty>

      <form *ngIf="cart.items().length > 0" class="space-y-6" (ngSubmit)="placeOrder()" novalidate>
        <fieldset class="ui-panel space-y-4">
          <legend class="ui-h2 mb-2">¿Cómo recibes tu compra?</legend>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="ui-panel flex items-start gap-3 cursor-pointer" [class.border-primary]="fulfillment() === 'pickup'">
              <input id="fulfillment-pickup" type="radio" name="fulfillment" value="pickup"
                     [ngModel]="fulfillment()" (ngModelChange)="fulfillment.set($event)" class="mt-1" />
              <span><strong>Retiro en el puesto</strong><br /><span class="text-text-muted">Pasas a recoger tu pedido.</span></span>
            </label>
            <label class="ui-panel flex items-start gap-3 cursor-pointer" [class.border-primary]="fulfillment() === 'delivery'">
              <input id="fulfillment-delivery" type="radio" name="fulfillment" value="delivery"
                     [ngModel]="fulfillment()" (ngModelChange)="fulfillment.set($event)" class="mt-1" />
              <span><strong>Entrega a domicilio</strong><br /><span class="text-text-muted">Te lo llevan a tu dirección.</span></span>
            </label>
          </div>

          <div *ngIf="fulfillment() === 'delivery'" class="space-y-4">
            <div>
              <label for="checkout-address" class="ui-label">Dirección</label>
              <input id="checkout-address" name="address" type="text" maxlength="200" class="ui-field"
                     [ngModel]="address()" (ngModelChange)="address.set($event)" placeholder="Calle, número, zona"
                     [attr.aria-invalid]="submitted() && !address().trim() ? 'true' : null" aria-describedby="checkout-address-error" />
              <p id="checkout-address-error" *ngIf="submitted() && !address().trim()" class="ui-alert-error mt-2" role="alert">La dirección es obligatoria.</p>
            </div>
            <div>
              <label for="checkout-ref" class="ui-label">Referencia</label>
              <input id="checkout-ref" name="addressRef" type="text" maxlength="200" class="ui-field"
                     [ngModel]="addressRef()" (ngModelChange)="addressRef.set($event)" placeholder="Portón verde, frente a la panadería"
                     [attr.aria-invalid]="submitted() && !addressRef().trim() ? 'true' : null" aria-describedby="checkout-ref-error" />
              <p id="checkout-ref-error" *ngIf="submitted() && !addressRef().trim()" class="ui-alert-error mt-2" role="alert">La referencia es obligatoria.</p>
            </div>
          </div>

          <label class="block">
            <span class="ui-label">Teléfono de contacto</span>
            <input id="checkout-phone" name="contactPhone" type="tel" maxlength="30" class="ui-field"
                   [ngModel]="contactPhone()" (ngModelChange)="contactPhone.set($event)" placeholder="Si lo dejas vacío usamos el de tu perfil" />
          </label>
          <label class="block">
            <span class="ui-label">Nota para el puesto (opcional)</span>
            <textarea id="checkout-note" name="note" rows="2" maxlength="300" class="ui-field"
                      [ngModel]="note()" (ngModelChange)="note.set($event)" placeholder="Horario, indicaciones…"></textarea>
          </label>
        </fieldset>

        <fieldset class="ui-panel space-y-4" id="payment-methods">
          <legend class="ui-h2 mb-2">¿Cómo pagas?</legend>
          <p *ngIf="methods().length === 0" class="ui-alert-error" role="alert" id="payment-none">
            Los puestos de tu compra no tienen un método de pago en común. Compra por separado en cada puesto.
          </p>
          <div *ngIf="methods().length > 0" class="grid gap-3 sm:grid-cols-2">
            <label *ngIf="methods().includes('cash_on_delivery')" class="ui-panel flex items-start gap-3 cursor-pointer" [class.border-primary]="method() === 'cash_on_delivery'">
              <input id="pay-cash" type="radio" name="paymentMethod" value="cash_on_delivery"
                     [ngModel]="method()" (ngModelChange)="paymentChoice.set($event)" class="mt-1" />
              <span><strong>Pago contra entrega</strong><br /><span class="text-text-muted">Pagas al recibir o al retirar.</span></span>
            </label>
            <label *ngIf="methods().includes('qr_transfer')" class="ui-panel flex items-start gap-3 cursor-pointer" [class.border-primary]="method() === 'qr_transfer'">
              <input id="pay-qr" type="radio" name="paymentMethod" value="qr_transfer"
                     [ngModel]="method()" (ngModelChange)="paymentChoice.set($event)" class="mt-1" />
              <span><strong>QR o transferencia</strong><br /><span class="text-text-muted">Pagas ahora y subes el comprobante.</span></span>
            </label>
          </div>
        </fieldset>

        <div class="ui-panel space-y-6">
          <h2 class="ui-h2">Resumen del pedido</h2>
          <section *ngFor="let group of cart.groups()" class="space-y-4" [attr.data-seller]="group.sellerId">
            <header class="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-dotted border-text-main pb-2">
              <h3 class="text-xl font-bold">{{ group.businessName }}</h3>
              <p *ngIf="fulfillment() === 'pickup'" class="text-text-muted">
                Retiro en: {{ group.location || 'consulta la ubicación con el puesto' }}
              </p>
            </header>
            <ul class="space-y-4">
              <li *ngFor="let item of group.items" class="flex items-center gap-4">
                <img [src]="item.product.image" [alt]="item.product.name" class="w-16 h-16 object-cover shrink-0" />
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-lg">{{ item.product.name }}</p>
                  <p class="text-text-muted">{{ item.quantity }} × Bs {{ item.product.price | number:'1.2-2' }}</p>
                </div>
                <span class="text-lg font-bold">Bs {{ (item.quantity * item.product.price) | number:'1.2-2' }}</span>
              </li>
            </ul>
            <p *ngIf="cart.groups().length > 1" class="flex justify-between text-text-muted">
              <span>Subtotal del puesto</span><span>Bs {{ group.subtotal | number:'1.2-2' }}</span>
            </p>
          </section>
          <p *ngIf="cart.groups().length > 1" class="text-text-muted">
            Tu compra tiene productos de {{ cart.groups().length }} puestos: se crea un pedido por puesto.
          </p>
          <p class="flex justify-between items-baseline text-2xl font-bold pt-4 border-t-4 border-dotted border-text-main">
            <span>Total</span>
            <span>Bs {{ cart.total() | number:'1.2-2' }}</span>
          </p>
        </div>

        <p *ngIf="errorMsg()" class="ui-alert-error" role="alert">{{ errorMsg() }}</p>

        <div class="flex flex-wrap gap-3">
          <button id="checkout-confirm" type="submit" [disabled]="placing() || methods().length === 0" class="ui-btn flex-1 sm:flex-none">
            <span *ngIf="placing()" class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            Confirmar pedido
          </button>
          <a routerLink="/cart" class="ui-btn ui-btn-ghost">Volver al carrito</a>
        </div>
      </form>
    </div>
  </main>
  `
})
export class CheckoutComponent implements OnInit {
  cart = inject(CartService);
  private toast = inject(ToastService);

  fulfillment = signal<Fulfillment>('pickup');
  address = signal('');
  addressRef = signal('');
  contactPhone = signal('');
  note = signal('');

  /** Methods every stand of the cart accepts; the buyer picks one of them */
  methods = computed(() => commonPaymentMethods(this.cart.groups()));
  paymentChoice = signal<PaymentMethod | null>(null);
  method = computed<PaymentMethod | null>(() => {
    const options = this.methods();
    const choice = this.paymentChoice();
    return choice && options.includes(choice) ? choice : options[0] ?? null;
  });
  donePayment = signal<PaymentMethod>('cash_on_delivery');

  orderIds = signal<number[]>([]);
  doneFulfillment = signal<Fulfillment>('pickup');
  placing = signal(false);
  submitted = signal(false);
  errorMsg = signal<string | null>(null);

  /** The delivery body the API expects; pickup never sends an address. */
  private request = computed<CheckoutRequest>(() => {
    const body: CheckoutRequest = { fulfillment: this.fulfillment() };
    const method = this.method();
    if (method) body.paymentMethod = method;
    if (this.fulfillment() === 'delivery') {
      body.address = this.address().trim();
      body.addressRef = this.addressRef().trim();
    }
    if (this.contactPhone().trim()) body.contactPhone = this.contactPhone().trim();
    if (this.note().trim()) body.note = this.note().trim();
    return body;
  });

  ngOnInit(): void {
    this.cart.load().subscribe();
  }

  placeOrder(): void {
    this.submitted.set(true);
    this.errorMsg.set(null);
    const body = this.request();
    if (!body.paymentMethod) return;
    if (body.fulfillment === 'delivery' && (!body.address || !body.addressRef)) return;

    this.placing.set(true);
    this.cart.checkout(body).subscribe({
      next: (res) => {
        this.doneFulfillment.set(body.fulfillment);
        this.donePayment.set(body.paymentMethod ?? 'cash_on_delivery');
        this.orderIds.set(res.orders.map((o) => o.id));
        this.placing.set(false);
        this.toast.success('¡Pedido realizado exitosamente!');
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'No se pudo procesar el pedido. Intenta nuevamente.');
        this.placing.set(false);
      },
    });
  }
}
