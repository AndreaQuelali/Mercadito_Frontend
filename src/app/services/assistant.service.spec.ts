import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';
import {
  AssistantService,
  CONVERSATION_KEY,
  MSG_CART_CHANGED,
  MSG_EXPIRED,
  MSG_RESOLVED,
  NOTICE_KEY,
} from './assistant.service';
import { AuthService } from './auth.service';
import { CartService } from './cart.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

const BASE = `${environment.apiUrl}/assistant`;
const ID = '11111111-1111-4111-8111-111111111111';
const ACTION = {
  id: 'a1',
  type: 'add_to_cart' as const,
  summary: 'Agregar 2 kg de Tomate (Bs 25.00)',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
};
const PRODUCT = { id: 7, name: 'Tomate', description: '', price: 12.5, unit: 'kg', stock: 4, image: 'x.jpg' };

@Component({ standalone: true, template: '' })
class HostStub {}

describe('AssistantService', () => {
  let svc: AssistantService;
  let http: HttpTestingController;
  let loggedIn: ReturnType<typeof signal<boolean>>;
  let cartLoad: jasmine.Spy;
  let toast: jasmine.SpyObj<ToastService>;

  // Angular 16 runs effects during change detection, so a host component drives them
  let host: ReturnType<typeof TestBed.createComponent<HostStub>>;
  const tick = () => host.detectChanges();

  function setup(opts: { stored?: string; logged?: boolean } = {}) {
    sessionStorage.clear();
    localStorage.removeItem(NOTICE_KEY);
    if (opts.stored) sessionStorage.setItem(CONVERSATION_KEY, opts.stored);
    loggedIn = signal(opts.logged ?? true);
    cartLoad = jasmine.createSpy('load').and.returnValue(of({ id: 1, items: [] }));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HostStub],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: loggedIn } },
        { provide: CartService, useValue: { load: cartLoad } },
        { provide: ToastService, useValue: toast },
      ],
    });
    host = TestBed.createComponent(HostStub);
    svc = TestBed.inject(AssistantService);
    http = TestBed.inject(HttpTestingController);
    tick();
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.removeItem(NOTICE_KEY);
  });

  const reply = (over: object = {}) => ({
    ok: true,
    message: '',
    data: { conversationId: ID, reply: 'Hola', products: [], pendingActions: [], ...over },
  });

  describe('status', () => {
    it('is enabled when the backend says so', () => {
      setup();
      svc.loadStatus();
      http.expectOne(`${BASE}/status`).flush({ ok: true, message: '', data: { enabled: true, model: 'm' } });
      expect(svc.enabled()).toBeTrue();
    });

    it('stays off when the backend says no or fails', () => {
      setup();
      svc.loadStatus();
      http.expectOne(`${BASE}/status`).flush({ ok: true, message: '', data: { enabled: false, model: null } });
      expect(svc.enabled()).toBeFalse();

      svc.loadStatus();
      http.expectOne(`${BASE}/status`).flush('x', { status: 500, statusText: 'err' });
      expect(svc.enabled()).toBeFalse();
    });
  });

  describe('send', () => {
    it('posts the message and keeps products, actions and the conversation id', () => {
      setup();
      svc.send('  agrega 2 tomates ');
      const req = http.expectOne(`${BASE}/messages`);
      expect(req.request.body).toEqual({ message: 'agrega 2 tomates', conversationId: undefined });
      expect(svc.sending()).toBeTrue();
      req.flush(reply({ products: [PRODUCT], pendingActions: [ACTION] }));

      expect(svc.sending()).toBeFalse();
      expect(sessionStorage.getItem(CONVERSATION_KEY)).toBe(ID);
      const [user, assistant] = svc.entries();
      expect(user).toEqual({ kind: 'user', text: 'agrega 2 tomates' });
      expect(assistant.kind === 'assistant' && assistant.products.length).toBe(1);
      expect(assistant.kind === 'assistant' && assistant.actions[0].state).toBe('pending');
    });

    it('reuses the conversation on the next message', () => {
      setup({ stored: ID });
      svc.send('hola');
      expect(http.expectOne(`${BASE}/messages`).request.body.conversationId).toBe(ID);
    });

    it('does not send empty, over-long or concurrent messages', () => {
      setup();
      svc.send('   ');
      svc.send('x'.repeat(1001));
      http.expectNone(`${BASE}/messages`);

      svc.send('x'.repeat(1000));
      svc.send('otro');
      http.expectOne(`${BASE}/messages`);
    });

    it('503 shows "no disponible" and retry resends the same message once', () => {
      setup();
      svc.send('hola');
      http.expectOne(`${BASE}/messages`).flush({ message: 'x' }, { status: 503, statusText: 'x' });
      const last = svc.entries()[1];
      expect(last).toEqual({ kind: 'error', text: 'El asistente no está disponible ahora', retryable: true });

      svc.retry();
      expect(svc.entries().length).toBe(1); // the error is gone, the user message is not duplicated
      const req = http.expectOne(`${BASE}/messages`);
      expect(req.request.body.message).toBe('hola');
      req.flush(reply());
      expect(svc.entries().map((e) => e.kind)).toEqual(['user', 'assistant']);
    });

    it('429 shows the wait given by Retry-After', () => {
      setup();
      svc.send('hola');
      http
        .expectOne(`${BASE}/messages`)
        .flush({ message: 'x' }, { status: 429, statusText: 'x', headers: { 'Retry-After': '42' } });
      const last = svc.entries()[1];
      expect(last.kind === 'error' && last.text).toContain('Vas muy rápido');
      expect(last.kind === 'error' && last.text).toContain('42');
    });

    it('a network error is retryable', () => {
      setup();
      svc.send('hola');
      http.expectOne(`${BASE}/messages`).error(new ProgressEvent('error'));
      const last = svc.entries()[1];
      expect(last.kind === 'error' && last.retryable).toBeTrue();
    });

    it('an expired stored conversation silently starts a new one with the same message', () => {
      setup({ stored: ID });
      svc.send('hola');
      http.expectOne(`${BASE}/messages`).flush({ message: 'x' }, { status: 404, statusText: 'x' });
      const again = http.expectOne(`${BASE}/messages`);
      expect(again.request.body.conversationId).toBeUndefined();
      again.flush(reply({ conversationId: 'new-id' }));

      expect(svc.entries().map((e) => e.kind)).toEqual(['user', 'assistant']);
      expect(sessionStorage.getItem(CONVERSATION_KEY)).toBe('new-id');
    });
  });

  describe('resume', () => {
    it('restores the messages and hangs pending actions from the last assistant message', () => {
      setup({ stored: ID });
      svc.resume();
      http.expectOne(`${BASE}/conversations/${ID}`).flush({
        ok: true,
        message: '',
        data: {
          conversationId: ID,
          messages: [
            { role: 'user', content: 'hola', at: '' },
            { role: 'assistant', content: 'Qué buscas', at: '' },
            { role: 'action_event', content: 'Agregar tomate', at: '' },
          ],
          pendingActions: [ACTION],
        },
      });
      expect(svc.entries().map((e) => e.kind)).toEqual(['user', 'assistant', 'event']);
      const assistant = svc.entries()[1];
      expect(assistant.kind === 'assistant' && assistant.actions[0].id).toBe('a1');
    });

    it('asks the server only once per page load', () => {
      setup({ stored: ID });
      svc.resume();
      http.expectOne(`${BASE}/conversations/${ID}`).flush({ ok: true, message: '', data: { conversationId: ID, messages: [], pendingActions: [] } });
      svc.resume();
      http.expectNone(`${BASE}/conversations/${ID}`);
    });

    it('a 404 starts a new conversation without showing an error', () => {
      setup({ stored: ID });
      svc.resume();
      http.expectOne(`${BASE}/conversations/${ID}`).flush({ message: 'x' }, { status: 404, statusText: 'x' });
      expect(svc.entries()).toEqual([]);
      expect(svc.conversationId()).toBeNull();
      expect(sessionStorage.getItem(CONVERSATION_KEY)).toBeNull();
    });

    it('does nothing for a guest or without a stored conversation', () => {
      setup({ stored: ID, logged: false });
      svc.resume();
      http.expectNone(`${BASE}/conversations/${ID}`);
    });
  });

  describe('new conversation and logout', () => {
    it('"Nueva conversación" empties the panel and forgets the id', () => {
      setup();
      svc.send('hola');
      http.expectOne(`${BASE}/messages`).flush(reply());
      svc.newConversation();
      expect(svc.entries()).toEqual([]);
      expect(sessionStorage.getItem(CONVERSATION_KEY)).toBeNull();
    });

    it('logging out discards the conversation and closes the panel', () => {
      setup();
      svc.openPanel();
      svc.send('hola');
      http.expectOne(`${BASE}/messages`).flush(reply());

      loggedIn.set(false);
      tick();

      expect(svc.entries()).toEqual([]);
      expect(svc.open()).toBeFalse();
      expect(sessionStorage.getItem(CONVERSATION_KEY)).toBeNull();
    });

    it('remembers the accepted privacy notice', () => {
      setup();
      expect(svc.noticeAccepted()).toBeFalse();
      svc.acceptNotice();
      expect(svc.noticeAccepted()).toBeTrue();
      expect(localStorage.getItem(NOTICE_KEY)).toBe('accepted');
    });
  });

  describe('pending actions', () => {
    const withAction = (type: typeof ACTION.type | 'checkout' = 'add_to_cart') => {
      svc.send('agrega');
      http.expectOne(`${BASE}/messages`).flush(reply({ pendingActions: [{ ...ACTION, type }] }));
    };
    const stateOf = () => {
      const e = svc.entries()[1];
      return e.kind === 'assistant' ? e.actions[0] : undefined;
    };

    it('confirm reloads the cart, shows a toast and marks it confirmed', () => {
      setup();
      withAction();
      svc.confirm('a1');
      expect(stateOf()?.state).toBe('confirming');
      http.expectOne(`${BASE}/actions/a1/confirm`).flush({ ok: true, message: '', data: { action: {}, result: {} } });

      expect(stateOf()?.state).toBe('confirmed');
      expect(cartLoad).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalled();
    });

    it('a double click sends one request', () => {
      setup();
      withAction();
      svc.confirm('a1');
      svc.confirm('a1');
      svc.reject('a1');
      http.expectOne(`${BASE}/actions/a1/confirm`);
      http.expectNone(`${BASE}/actions/a1/reject`);
    });

    it('confirming an order adds the order number and a link to /orders', () => {
      setup();
      withAction('checkout');
      svc.confirm('a1');
      http.expectOne(`${BASE}/actions/a1/confirm`).flush({ ok: true, message: '', data: { action: {}, result: { checkoutId: 'c', orders: [{ id: 42 }] } } });

      const event = svc.entries()[2];
      expect(event).toEqual({ kind: 'event', text: 'Pedido #42 creado.', link: { label: 'Ver mis pedidos', url: '/orders' } });
    });

    it('lists every order when the purchase was split between stands', () => {
      setup();
      withAction('checkout');
      svc.confirm('a1');
      http.expectOne(`${BASE}/actions/a1/confirm`).flush({ ok: true, message: '', data: { action: {}, result: { checkoutId: 'c', orders: [{ id: 42 }, { id: 43 }] } } });

      expect(svc.entries()[2]).toEqual({ kind: 'event', text: 'Pedidos #42, #43 creados.', link: { label: 'Ver mis pedidos', url: '/orders' } });
    });

    const failWith = (status: number, message: string) => {
      setup();
      withAction();
      svc.confirm('a1');
      http.expectOne(`${BASE}/actions/a1/confirm`).flush({ ok: false, message, status }, { status, statusText: 'x' });
    };

    it('409 because the cart changed', () => {
      failWith(409, 'Tu carrito cambió desde que se propuso el pedido. Pídeme el pedido de nuevo.');
      expect(stateOf()).toEqual(jasmine.objectContaining({ state: 'failed', error: MSG_CART_CHANGED }));
    });

    it('409 because it was already resolved elsewhere', () => {
      failWith(409, 'Esta acción ya fue resuelta');
      expect(stateOf()).toEqual(jasmine.objectContaining({ state: 'failed', error: MSG_RESOLVED }));
    });

    it('404 means the proposal expired', () => {
      failWith(404, 'Acción no encontrada o vencida');
      expect(stateOf()).toEqual(jasmine.objectContaining({ state: 'expired', error: MSG_EXPIRED }));
    });

    it('400 shows the reason the backend gives', () => {
      failWith(400, 'No hay suficiente stock de Tomate');
      expect(stateOf()).toEqual(jasmine.objectContaining({ state: 'failed', error: 'No hay suficiente stock de Tomate' }));
    });

    it('a server error leaves the action pending so it can be tried again', () => {
      failWith(500, 'boom');
      expect(stateOf()?.state).toBe('pending');
      expect(toast.error).toHaveBeenCalled();
    });

    it('reject marks it rejected and never reloads the cart', () => {
      setup();
      withAction();
      svc.reject('a1');
      http.expectOne(`${BASE}/actions/a1/reject`).flush({ ok: true, message: '', data: {} });
      expect(stateOf()?.state).toBe('rejected');
      expect(cartLoad).not.toHaveBeenCalled();
    });

    it('markExpired only affects pending actions', () => {
      setup();
      withAction();
      svc.markExpired('a1');
      expect(stateOf()?.state).toBe('expired');
    });
  });
});
