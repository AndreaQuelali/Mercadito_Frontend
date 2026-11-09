import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderEvent, OrderStatus } from '../../services/order.service';

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  confirmed: 'Confirmado',
  shipped: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const ACTOR_LABEL: Record<OrderEvent['actorRole'], string> = {
  buyer: 'el comprador',
  seller: 'el puesto',
  admin: 'un administrador',
};

/** Status changes of an order: who, when, from which status to which, and why. */
@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule],
  template: `
  <details *ngIf="events.length" class="order-history">
    <summary class="cursor-pointer font-semibold">Historial ({{ events.length }})</summary>
    <ol class="mt-3 space-y-2">
      <li *ngFor="let e of events" class="order-history-item">
        <span class="text-text-muted">{{ e.createdAt | date:'d MMM y, HH:mm' }}</span> —
        {{ label(e.from) }} → <strong>{{ label(e.to) }}</strong>
        por {{ actor(e) }}<span *ngIf="e.forced"> (forzado)</span><span *ngIf="e.reason">: {{ e.reason }}</span>
      </li>
    </ol>
  </details>
  `,
})
export class OrderHistoryComponent {
  @Input() events: OrderEvent[] = [];

  label(s: OrderStatus): string { return STATUS_LABEL[s] ?? s; }
  actor(e: OrderEvent): string { return ACTOR_LABEL[e.actorRole] ?? e.actorRole; }
}
