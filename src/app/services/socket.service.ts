import { Injectable, inject, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

// Minimal Socket.IO client interface — no package required, uses CDN in index.html
declare const io: (url: string, opts?: Record<string, unknown>) => SocketIOClient;
interface SocketIOClient {
  on(event: string, cb: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
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
      auth: { token },
      transports: ['websocket'],
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
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
