import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Order, OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';

/** Payment screen of one order: how to pay the stand, the exact amount and the proof upload. */
@Component({
  selector: 'app-order-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
  <main class="ui-page max-w-2xl">
    <h1 class="ui-title mb-6">Pago del pedido</h1>

    <div *ngIf="loading()" class="ui-skel h-64"></div>
    <p *ngIf="!loading() && !order()" class="ui-alert-error" role="alert">No encontramos este pedido.</p>

    <section *ngIf="order() as o" class="space-y-6" id="pay-panel">
      <div class="ui-panel space-y-2">
        <p class="text-text-muted">{{ o.seller?.businessName }} · Orden #{{ o.id }}</p>
        <p class="text-text-muted">Monto a pagar</p>
        <p id="pay-amount" class="font-display text-4xl font-bold">Bs {{ o.total | number:'1.2-2' }}</p>
      </div>

      <div *ngIf="o.paymentStatus === 'paid'" class="ui-alert-warn" role="status">
        Pago confirmado{{ o.paidAt ? ' el ' + (o.paidAt | date:'d MMM y, HH:mm') : '' }}. ¡Gracias!
      </div>

      <ng-container *ngIf="o.paymentMethod === 'cash_on_delivery'">
        <div class="ui-panel space-y-2">
          <h2 class="ui-h2">Pago contra entrega</h2>
          <p>Pagas {{ o.fulfillment === 'delivery' ? 'cuando recibas' : 'cuando retires' }} tu pedido. El puesto marcará el cobro.</p>
        </div>
      </ng-container>

      <ng-container *ngIf="o.paymentMethod === 'qr_transfer'">
        <div class="ui-panel space-y-4">
          <h2 class="ui-h2">Paga por QR o transferencia</h2>
          <img *ngIf="o.seller?.paymentQrUrl" [src]="o.seller?.paymentQrUrl" alt="Código QR de pago del puesto" class="w-56 h-56 object-contain bg-white p-2" />
          <p *ngIf="o.seller?.paymentInstructions" id="pay-instructions" class="whitespace-pre-line">{{ o.seller?.paymentInstructions }}</p>
          <p class="text-text-muted">Paga el monto exacto y sube aquí el comprobante.</p>
        </div>

        <div *ngIf="o.paymentStatus === 'rejected'" class="ui-alert-error" role="alert" id="pay-rejected">
          El puesto rechazó tu comprobante: {{ o.paymentRejectReason }}. Sube uno nuevo.
        </div>

        <div *ngIf="o.paymentStatus === 'proof_uploaded'" class="ui-alert-warn" role="status" id="pay-waiting">
          Comprobante enviado. Esperando la confirmación del puesto.
          <a *ngIf="o.paymentProofUrl" [href]="o.paymentProofUrl" target="_blank" rel="noopener" class="underline">Ver comprobante</a>
        </div>

        <form *ngIf="o.paymentStatus === 'unpaid' || o.paymentStatus === 'rejected'" class="ui-panel space-y-4" (ngSubmit)="send()" novalidate>
          <div>
            <label for="proof-url" class="ui-label">Enlace de tu comprobante</label>
            <input id="proof-url" name="url" type="url" class="ui-field" placeholder="https://..."
                   [ngModel]="url()" (ngModelChange)="url.set($event)" />
            <p *ngIf="errorMsg()" class="ui-alert-error mt-2" role="alert">{{ errorMsg() }}</p>
          </div>
          <button id="proof-send" type="submit" class="ui-btn" [disabled]="sending()">
            <span *ngIf="sending()" class="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            Enviar comprobante
          </button>
        </form>
      </ng-container>

      <a routerLink="/orders" class="ui-btn ui-btn-ghost">Volver a mis pedidos</a>
    </section>
  </main>
  `,
})
export class OrderPayComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private orders = inject(OrderService);
  private toast = inject(ToastService);

  order = signal<Order | null>(null);
  loading = signal(true);
  sending = signal(false);
  url = signal('');
  errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.orders.getById(id).subscribe({
      next: (o) => { this.order.set(o); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  send(): void {
    const o = this.order();
    const url = this.url().trim();
    this.errorMsg.set(null);
    if (!o) return;
    if (!/^https?:\/\/\S+$/i.test(url)) {
      this.errorMsg.set('Pega el enlace completo del comprobante (https://...).');
      return;
    }
    this.sending.set(true);
    this.orders.uploadProof(o.id, url).subscribe({
      next: (updated) => {
        // The PATCH answer has no seller data: keep what the page already knows
        this.order.set({ ...o, ...updated, seller: o.seller });
        this.url.set('');
        this.sending.set(false);
        this.toast.success('Comprobante enviado');
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message ?? 'No se pudo enviar el comprobante.');
        this.sending.set(false);
      },
    });
  }
}
