import { Injectable, effect, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { ToastService } from './toast.service';
import type { ProductCard } from '../components/product-card/product-card.component';

export interface AssistantStatus {
  enabled: boolean;
  model: string | null;
}

export interface PendingActionView {
  id: string;
  type: 'add_to_cart' | 'update_cart_item' | 'remove_cart_item' | 'checkout';
  summary: string;
  expiresAt: string;
  state: 'pending' | 'confirming' | 'confirmed' | 'rejected' | 'expired' | 'failed';
  error?: string;
}

export type ChatEntry =
  | { kind: 'user'; text: string }
  | { kind: 'assistant'; text: string; products: ProductCard[]; actions: PendingActionView[] }
  | { kind: 'event'; text: string; link?: { label: string; url: string } }
  | { kind: 'error'; text: string; retryable: boolean };

interface ApiResponse<T> {
  ok: boolean;
  message: string;
  data: T;
}

type ActionWire = Omit<PendingActionView, 'state' | 'error'>;

interface ReplyWire {
  conversationId: string;
  reply: string;
  products: ProductCard[];
  pendingActions: ActionWire[];
}

interface ConversationWire {
  conversationId: string;
  messages: { role: 'user' | 'assistant' | 'action_event'; content: string; at: string }[];
  pendingActions: ActionWire[];
}

export const CONVERSATION_KEY = 'mercadito_assistant_conversation';
export const NOTICE_KEY = 'mercadito_assistant_notice_v1';
export const MAX_MESSAGE_LENGTH = 1000;

export const SUGGESTIONS = [
  'Busco verduras para una ensalada',
  '¿Qué tengo en mi carrito?',
  '¿Cómo va mi último pedido?',
  'Recomiéndame algo de panadería',
];

export const MSG_UNAVAILABLE = 'El asistente no está disponible ahora';
export const MSG_OFFLINE = 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.';
export const MSG_GENERIC = 'Algo salió mal. Inténtalo de nuevo.';
export const MSG_CART_CHANGED =
  'Tu carrito cambió desde la propuesta. Pídele al asistente que vuelva a armar el pedido.';
export const MSG_EXPIRED = 'Esta propuesta venció.';
export const MSG_RESOLVED = 'Ya resuelta';

const storage = {
  get(area: 'session' | 'local', key: string): string | null {
    try {
      return (area === 'session' ? sessionStorage : localStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: 'session' | 'local', key: string, value: string): void {
    try {
      (area === 'session' ? sessionStorage : localStorage).setItem(key, value);
    } catch {
      /* storage can be blocked: the assistant still works for this page load */
    }
  },
  remove(area: 'session' | 'local', key: string): void {
    try {
      (area === 'session' ? sessionStorage : localStorage).removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const withState = (a: ActionWire): PendingActionView => ({ ...a, state: 'pending' });

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private cart = inject(CartService);
  private toast = inject(ToastService);

  private readonly base = `${environment.apiUrl}/assistant`;

  readonly status = signal<AssistantStatus | null>(null);
  readonly open = signal(false);
  readonly sending = signal(false);
  readonly entries = signal<ChatEntry[]>([]);
  readonly conversationId = signal<string | null>(storage.get('session', CONVERSATION_KEY));
  readonly noticeAccepted = signal(storage.get('local', NOTICE_KEY) === 'accepted');

  /** The button only exists when the backend says the assistant is on */
  readonly enabled = computed(() => this.status()?.enabled === true);
  readonly isEmpty = computed(() => this.entries().length === 0);

  private lastMessage: string | null = null;
  private resumedFor: string | null = null;

  constructor() {
    // Logging out discards the conversation: it belongs to the user who had the session
    effect(
      () => {
        if (!this.auth.isLoggedIn()) {
          this.newConversation();
          this.open.set(false);
        }
      },
      { allowSignalWrites: true }
    );
  }

  // ---------- Status ----------

  loadStatus(): void {
    this.http.get<ApiResponse<AssistantStatus>>(`${this.base}/status`).subscribe({
      next: (res) => this.status.set(res.data),
      // If the status cannot be read the button stays hidden: the app looks as it did before
      error: () => this.status.set({ enabled: false, model: null }),
    });
  }

  // ---------- Panel ----------

  openPanel(): void {
    this.open.set(true);
    this.resume();
  }

  closePanel(): void {
    this.open.set(false);
  }

  acceptNotice(): void {
    storage.set('local', NOTICE_KEY, 'accepted');
    this.noticeAccepted.set(true);
  }

  // ---------- Conversation ----------

  /** Restores the conversation kept in sessionStorage (once per page load) */
  resume(): void {
    const id = this.conversationId();
    if (!id || !this.auth.isLoggedIn() || this.resumedFor === id || this.entries().length > 0) return;
    this.resumedFor = id;

    this.http.get<ApiResponse<ConversationWire>>(`${this.base}/conversations/${id}`).subscribe({
      next: (res) => this.entries.set(this.entriesFromServer(res.data)),
      error: (err: HttpErrorResponse) => {
        // Expired or not ours: start clean without showing an error
        if (err.status === 404) this.newConversation();
      },
    });
  }

  newConversation(): void {
    this.entries.set([]);
    this.conversationId.set(null);
    this.lastMessage = null;
    this.resumedFor = null;
    this.sending.set(false);
    storage.remove('session', CONVERSATION_KEY);
  }

  send(raw: string): void {
    const text = raw.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH || this.sending()) return;
    this.entries.update((e) => [...e, { kind: 'user', text }]);
    this.deliver(text, true);
  }

  /** Sends the last message again after a 503, a 429 or a network error */
  retry(): void {
    if (!this.lastMessage || this.sending()) return;
    this.entries.update((e) => (e[e.length - 1]?.kind === 'error' ? e.slice(0, -1) : e));
    this.deliver(this.lastMessage, true);
  }

  private deliver(message: string, allowFreshConversation: boolean): void {
    this.lastMessage = message;
    this.sending.set(true);
    const conversationId = this.conversationId() ?? undefined;

    this.http
      .post<ApiResponse<ReplyWire>>(`${this.base}/messages`, { message, conversationId })
      .subscribe({
        next: (res) => {
          const data = res.data;
          this.conversationId.set(data.conversationId);
          this.resumedFor = data.conversationId;
          storage.set('session', CONVERSATION_KEY, data.conversationId);
          this.entries.update((e) => [
            ...e,
            {
              kind: 'assistant',
              text: data.reply,
              products: data.products ?? [],
              actions: (data.pendingActions ?? []).map(withState),
            },
          ]);
          this.sending.set(false);
        },
        error: (err: HttpErrorResponse) => {
          // The stored conversation expired: the message goes into a new one, silently
          if (err.status === 404 && conversationId && allowFreshConversation) {
            this.conversationId.set(null);
            storage.remove('session', CONVERSATION_KEY);
            this.deliver(message, false);
            return;
          }
          this.entries.update((e) => [...e, this.errorEntry(err)]);
          this.sending.set(false);
        },
      });
  }

  private errorEntry(err: HttpErrorResponse): ChatEntry {
    if (err.status === 0) return { kind: 'error', text: MSG_OFFLINE, retryable: true };
    if (err.status === 503) return { kind: 'error', text: MSG_UNAVAILABLE, retryable: true };
    if (err.status === 429) {
      const seconds = Number(err.headers?.get('Retry-After')) || 60;
      return {
        kind: 'error',
        text: `Vas muy rápido. Espera ${seconds} ${seconds === 1 ? 'segundo' : 'segundos'} e inténtalo de nuevo.`,
        retryable: true,
      };
    }
    return { kind: 'error', text: MSG_GENERIC, retryable: true };
  }

  private entriesFromServer(data: ConversationWire): ChatEntry[] {
    const entries: ChatEntry[] = data.messages.map((m): ChatEntry => {
      if (m.role === 'user') return { kind: 'user', text: m.content };
      if (m.role === 'assistant') return { kind: 'assistant', text: m.content, products: [], actions: [] };
      return { kind: 'event', text: m.content };
    });

    // Actions that still wait hang from the last assistant message, as they did when they were proposed
    const pending = data.pendingActions.map(withState);
    if (pending.length) {
      const last = entries.map((e) => e.kind).lastIndexOf('assistant');
      if (last >= 0) {
        const entry = entries[last] as Extract<ChatEntry, { kind: 'assistant' }>;
        entries[last] = { ...entry, actions: pending };
      } else {
        entries.push({ kind: 'assistant', text: '', products: [], actions: pending });
      }
    }
    return entries;
  }

  // ---------- Pending actions ----------

  private findAction(id: string): PendingActionView | undefined {
    for (const e of this.entries()) {
      if (e.kind === 'assistant') {
        const found = e.actions.find((a) => a.id === id);
        if (found) return found;
      }
    }
    return undefined;
  }

  private patchAction(id: string, patch: Partial<PendingActionView>): void {
    this.entries.update((entries) =>
      entries.map((e) =>
        e.kind === 'assistant' && e.actions.some((a) => a.id === id)
          ? { ...e, actions: e.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) }
          : e
      )
    );
  }

  markExpired(id: string): void {
    if (this.findAction(id)?.state === 'pending') this.patchAction(id, { state: 'expired', error: MSG_EXPIRED });
  }

  confirm(id: string): void {
    const action = this.findAction(id);
    if (!action || action.state !== 'pending') return; // also blocks a double click
    this.patchAction(id, { state: 'confirming', error: undefined });

    this.http
      .post<ApiResponse<{ action: { id: string; type: string }; result: unknown }>>(
        `${this.base}/actions/${id}/confirm`,
        {}
      )
      .subscribe({
        next: (res) => {
          this.patchAction(id, { state: 'confirmed' });
          // The navbar counter reads the cart signal
          this.cart.load().subscribe({ error: () => undefined });
          this.toast.success('Listo, el asistente aplicó tu confirmación');

          if (action.type === 'checkout') {
            // One order per stand: the result is { checkoutId, orders: [{ id }] }
            const orders = (res.data.result as { orders?: { id: number | string }[] } | null)?.orders ?? [];
            const ids = orders.map((o) => `#${o.id}`);
            const text =
              ids.length === 0 ? 'Pedido creado.'
              : ids.length === 1 ? `Pedido ${ids[0]} creado.`
              : `Pedidos ${ids.join(', ')} creados.`;
            this.entries.update((e) => [
              ...e,
              {
                kind: 'event',
                text,
                link: { label: 'Ver mis pedidos', url: '/orders' },
              },
            ]);
          }
        },
        error: (err: HttpErrorResponse) => this.confirmFailed(id, err),
      });
  }

  private confirmFailed(id: string, err: HttpErrorResponse): void {
    const backendMessage = typeof err.error?.message === 'string' ? err.error.message : '';
    if (err.status === 409) {
      // 409 is either "the cart changed" or "someone already resolved it"
      const cartChanged = /carrito/i.test(backendMessage);
      this.patchAction(id, { state: 'failed', error: cartChanged ? MSG_CART_CHANGED : MSG_RESOLVED });
    } else if (err.status === 404) {
      this.patchAction(id, { state: 'expired', error: MSG_EXPIRED });
    } else if (err.status === 400) {
      this.patchAction(id, { state: 'failed', error: backendMessage || MSG_GENERIC });
    } else {
      // Network or server trouble: nothing was resolved, the user can try again
      this.patchAction(id, { state: 'pending', error: undefined });
      this.toast.error(err.status === 0 ? MSG_OFFLINE : MSG_GENERIC);
    }
  }

  reject(id: string): void {
    const action = this.findAction(id);
    if (!action || action.state !== 'pending') return;
    this.patchAction(id, { state: 'confirming', error: undefined });

    this.http.post(`${this.base}/actions/${id}/reject`, {}).subscribe({
      next: () => this.patchAction(id, { state: 'rejected' }),
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) this.patchAction(id, { state: 'failed', error: MSG_RESOLVED });
        else if (err.status === 404) this.patchAction(id, { state: 'expired', error: MSG_EXPIRED });
        else {
          this.patchAction(id, { state: 'pending', error: undefined });
          this.toast.error(err.status === 0 ? MSG_OFFLINE : MSG_GENERIC);
        }
      },
    });
  }
}
