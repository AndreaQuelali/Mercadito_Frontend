import { Injectable, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

// Minimal Socket.IO client interface — no package required, uses CDN in index.html
declare const io: (url: string, opts?: Record<string, unknown>) => SocketIOClient;
interface SocketIOClient {
  on(event: string, cb: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  connect(): void;
  disconnect(): void;
  connected: boolean;
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private socket: SocketIOClient | null = null;

  connect(): void {
    if (this.socket?.connected) return;
    if (typeof io === 'undefined') return; // Socket.IO CDN not loaded yet

    const token = this.auth.getToken();
    if (!token) return;

    this.socket = io(environment.apiUrl, {
      // Function form: every (re)connection sends the latest access token
      auth: (cb: (data: Record<string, unknown>) => void) => cb({ token: this.auth.getToken() }),
      transports: ['websocket'],
    });

    // The server refuses an expired token and socket.io does not retry on its own:
    // renew the session and connect again with the new token
    this.socket.on('connect_error', (err: unknown) => {
      if ((err as { message?: string })?.message === 'Invalid or expired token') {
        this.auth.refresh().subscribe({
          next: () => this.socket?.connect(),
          error: () => undefined, // an invalid session is handled by the HTTP interceptor
        });
      }
    });

    this.socket.on('connect', () => {
      const user = this.auth.currentUser();
      if (user) {
        this.socket!.emit('register', user.sub);
      }
    });

    this.socket.on('order:status', (data: unknown) => {
      const d = data as { orderId: number; status: string };
      this.toast.info(`Tu pedido #${d.orderId} cambió a: ${d.status}`);
    });

    // Seller events
    this.socket.on('order:new', (data: unknown) => {
      const d = data as { orderId: number; items: { name: string; quantity: number }[] };
      const count = d.items.reduce((sum, i) => sum + i.quantity, 0);
      this.toast.info(`Nuevo pedido #${d.orderId}: ${count} ${count === 1 ? 'unidad' : 'unidades'} de tus productos`);
    });

    this.socket.on('stock:low', (data: unknown) => {
      const d = data as { name: string; stock: number };
      const msg = d.stock === 0
        ? `Se agotó el stock de "${d.name}"`
        : `Stock bajo en "${d.name}": quedan ${d.stock}`;
      this.toast.show(msg, 'info', 6000);
    });

    this.socket.on('review:new', (data: unknown) => {
      const d = data as { name: string; rating: number };
      this.toast.info(`Nueva reseña de ${d.rating}★ en "${d.name}"`);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
