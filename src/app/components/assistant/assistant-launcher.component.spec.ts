import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AssistantLauncherComponent, isMarketplacePath } from './assistant-launcher.component';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { CONVERSATION_KEY, NOTICE_KEY, SUGGESTIONS } from '../../services/assistant.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apiUrl}/assistant`;
const ID = '11111111-1111-4111-8111-111111111111';
const PRODUCT = { id: 7, name: 'Tomate', description: '', price: 12.5, unit: 'kg', stock: 4, image: 'x.jpg' };
const ACTION = {
  id: 'a1',
  type: 'add_to_cart',
  summary: 'Agregar 2 kg de Tomate (Bs 25.00)',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
};

@Component({ standalone: true, template: '' })
class PageStub {}

describe('isMarketplacePath', () => {
  it('matches the marketplace pages, with or without query and trailing slash', () => {
    for (const url of ['/home', '/products', '/products?q=pan', '/product/12', '/cart', '/checkout', '/orders/', '/orders#top']) {
      expect(isMarketplacePath(url)).withContext(url).toBeTrue();
    }
  });

  it('does not match the landing, auth, seller or unknown pages', () => {
    for (const url of ['/', '', '/auth/login', '/auth/register', '/reset-password', '/dashboard', '/dashboard/products', '/seller/onboarding', '/admin/sellers', '/product', '/product/1/extra']) {
      expect(isMarketplacePath(url)).withContext(url).toBeFalse();
    }
  });
});

describe('AssistantLauncherComponent', () => {
  let fixture: ComponentFixture<AssistantLauncherComponent>;
  let http: HttpTestingController;
  let router: Router;
  let loggedIn: ReturnType<typeof signal<boolean>>;
  let el: HTMLElement;

  const q = <T extends HTMLElement = HTMLElement>(selector: string) => el.querySelector<T>(selector);
  const qa = (selector: string) => Array.from(el.querySelectorAll<HTMLElement>(selector));

  /** Lets the effects, the focus timers and the DOM settle */
  async function settle() {
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
  }

  async function setup(opts: { url?: string; enabled?: boolean; logged?: boolean; stored?: string; notice?: boolean } = {}) {
    sessionStorage.clear();
    localStorage.removeItem(NOTICE_KEY);
    if (opts.notice !== false) localStorage.setItem(NOTICE_KEY, 'accepted');
    if (opts.stored) sessionStorage.setItem(CONVERSATION_KEY, opts.stored);
    loggedIn = signal(opts.logged ?? true);

    TestBed.configureTestingModule({
      imports: [AssistantLauncherComponent, HttpClientTestingModule, RouterTestingModule.withRoutes([{ path: '**', component: PageStub }])],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: loggedIn } },
        { provide: CartService, useValue: { load: () => of({ id: 1, items: [] }) } },
      ],
    });
    router = TestBed.inject(Router);
    http = TestBed.inject(HttpTestingController);
    await router.navigateByUrl(opts.url ?? '/home');

    fixture = TestBed.createComponent(AssistantLauncherComponent);
    el = fixture.nativeElement;
    fixture.detectChanges();
    http.expectOne(`${BASE}/status`).flush({ ok: true, message: '', data: { enabled: opts.enabled ?? true, model: 'm' } });
    await settle();
  }

  async function openPanel() {
    q('#assistant-launcher')!.click();
    await settle();
  }

  async function sendReply(body: object = {}) {
    await settle();
    http.expectOne(`${BASE}/messages`).flush({
      ok: true,
      message: '',
      data: { conversationId: ID, reply: 'Hola', products: [], pendingActions: [], ...body },
    });
    await settle();
  }

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.removeItem(NOTICE_KEY);
    document.body.classList.remove('assistant-open');
  });

  describe('visibility', () => {
    it('shows the button on a marketplace page', async () => {
      await setup({ url: '/products' });
      expect(q('#assistant-launcher')).not.toBeNull();
    });

    it('hides it on the landing, auth and dashboard pages', async () => {
      await setup({ url: '/' });
      expect(q('#assistant-launcher')).toBeNull();

      await router.navigateByUrl('/auth/login');
      await settle();
      expect(q('#assistant-launcher')).toBeNull();

      await router.navigateByUrl('/dashboard/sales');
      await settle();
      expect(q('#assistant-launcher')).toBeNull();

      await router.navigateByUrl('/cart');
      await settle();
      expect(q('#assistant-launcher')).not.toBeNull();
    });

    it('is hidden everywhere when the assistant is disabled', async () => {
      await setup({ enabled: false });
      expect(q('#assistant-launcher')).toBeNull();
    });

    it('a guest sees the button', async () => {
      await setup({ logged: false });
      expect(q('#assistant-launcher')).not.toBeNull();
    });
  });

  describe('guest', () => {
    it('explains that a session is needed and links to the login with the current page', async () => {
      await setup({ logged: false, url: '/product/12' });
      await openPanel();

      expect(q('#assistant-guest')).not.toBeNull();
      expect(q('#assistant-input')).toBeNull();
      const link = q<HTMLAnchorElement>('#assistant-login-link')!;
      expect(link.getAttribute('href')).toBe('/auth/login?returnUrl=%2Fproduct%2F12');
    });
  });

  describe('dialog', () => {
    it('is a labelled dialog and moves the focus to the text box', async () => {
      await setup();
      await openPanel();

      const dialog = q('#assistant-panel')!;
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(q(`#${dialog.getAttribute('aria-labelledby')}`)!.textContent).toContain('Asistente');
      expect(document.activeElement).toBe(q('#assistant-input'));
      expect(q('#assistant-messages')!.getAttribute('aria-live')).toBe('polite');
      expect(document.body.classList.contains('assistant-open')).toBeTrue();
    });

    it('Esc closes the panel and returns the focus to the button', async () => {
      await setup();
      await openPanel();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();

      expect(q('#assistant-panel')).toBeNull();
      expect(document.activeElement).toBe(q('#assistant-launcher'));
      expect(document.body.classList.contains('assistant-open')).toBeFalse();
    });
  });

  describe('privacy notice', () => {
    it('shows the notice the first time, hides the chat until accepted and never again after', async () => {
      await setup({ notice: false });
      await openPanel();
      expect(q('#assistant-notice')!.textContent).toContain('OpenAI');
      expect(q('#assistant-input')).toBeNull();
      expect(q('#assistant-privacy-line')).not.toBeNull();

      q('#assistant-notice-accept')!.click();
      await settle();
      expect(q('#assistant-notice')).toBeNull();
      expect(q('#assistant-input')).not.toBeNull();
      expect(localStorage.getItem(NOTICE_KEY)).toBe('accepted');

      q('#assistant-close')!.click();
      await settle();
      await openPanel();
      expect(q('#assistant-notice')).toBeNull();
      expect(q('#assistant-privacy-line')).not.toBeNull();
    });
  });

  describe('conversation', () => {
    it('shows the 4 suggestions on an empty conversation and a chip sends its text', async () => {
      await setup();
      await openPanel();

      const chips = qa('[id^="assistant-chip-"]');
      expect(chips.map((c) => c.textContent!.trim())).toEqual(SUGGESTIONS);

      chips[1].click();
      expect(http.expectOne(`${BASE}/messages`).request.body.message).toBe('¿Qué tengo en mi carrito?');
      await settle();
      expect(q('[data-role="user"]')!.textContent).toContain('¿Qué tengo en mi carrito?');
    });

    it('disables the box while waiting, shows the typing indicator and re-enables on the reply', async () => {
      await setup();
      await openPanel();
      const input = q<HTMLTextAreaElement>('#assistant-input')!;
      input.value = 'hola';
      input.dispatchEvent(new Event('input'));
      await settle();
      q('#assistant-send')!.click();
      await settle();

      expect(q<HTMLTextAreaElement>('#assistant-input')!.disabled).toBeTrue();
      expect(q('#assistant-typing')).not.toBeNull();

      await sendReply({ reply: 'Hola, ¿qué buscas?' });
      expect(q<HTMLTextAreaElement>('#assistant-input')!.disabled).toBeFalse();
      expect(q('#assistant-typing')).toBeNull();
      expect(q('[data-role="assistant"]')!.textContent).toContain('Hola, ¿qué buscas?');
      expect(document.activeElement).toBe(q('#assistant-input'));
    });

    it('Enter sends and Shift+Enter does not', async () => {
      await setup();
      await openPanel();
      const input = q<HTMLTextAreaElement>('#assistant-input')!;
      input.value = 'hola';
      input.dispatchEvent(new Event('input'));

      const shift = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true });
      input.dispatchEvent(shift);
      expect(shift.defaultPrevented).toBeFalse();
      http.expectNone(`${BASE}/messages`);

      const enter = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      input.dispatchEvent(enter);
      expect(enter.defaultPrevented).toBeTrue();
      http.expectOne(`${BASE}/messages`);
    });

    it('counts up to 1000 characters and refuses to send more', async () => {
      await setup();
      await openPanel();
      const input = q<HTMLTextAreaElement>('#assistant-input')!;

      input.value = 'x'.repeat(1000);
      input.dispatchEvent(new Event('input'));
      await settle();
      expect(q('#assistant-counter')!.textContent!.trim()).toBe('1000/1000');
      expect(q<HTMLButtonElement>('#assistant-send')!.disabled).toBeFalse();

      input.value = 'x'.repeat(1001);
      input.dispatchEvent(new Event('input'));
      await settle();
      expect(q('#assistant-counter')!.textContent!.trim()).toBe('1001/1000');
      expect(q<HTMLButtonElement>('#assistant-send')!.disabled).toBeTrue();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
      http.expectNone(`${BASE}/messages`);
    });

    it('products show as cards that link to the detail, with no add button', async () => {
      await setup();
      await openPanel();
      qa('[id^="assistant-chip-"]')[0].click();
      await sendReply({ products: [PRODUCT] });

      const card = q<HTMLAnchorElement>('#assistant-product-7')!;
      expect(card.getAttribute('href')).toBe('/product/7');
      expect(card.textContent).toContain('Tomate');
      expect(card.textContent).toContain('Bs 12.50');
      expect(card.textContent).toContain('4 disponibles');
      expect(card.querySelector('img')!.getAttribute('alt')).toBe('Tomate');
      expect(card.querySelector('button')).toBeNull();
      expect(qa('[data-role="assistant"] button').length).toBe(0);
    });

    it('a 503 shows the error with a retry button that resends the message', async () => {
      await setup();
      await openPanel();
      qa('[id^="assistant-chip-"]')[0].click();
      http.expectOne(`${BASE}/messages`).flush({ message: 'x' }, { status: 503, statusText: 'x' });
      await settle();

      expect(q('[data-role="error"]')!.textContent).toContain('El asistente no está disponible ahora');
      q('#assistant-retry')!.click();
      const retried = http.expectOne(`${BASE}/messages`);
      expect(retried.request.body.message).toBe(SUGGESTIONS[0]);
      retried.flush({ ok: true, message: '', data: { conversationId: ID, reply: 'Hola', products: [], pendingActions: [] } });
      await settle();
      expect(q('[data-role="error"]')).toBeNull();
    });

    it('resumes the stored conversation when the panel opens', async () => {
      await setup({ stored: ID });
      q('#assistant-launcher')!.click();
      http.expectOne(`${BASE}/conversations/${ID}`).flush({
        ok: true,
        message: '',
        data: {
          conversationId: ID,
          messages: [
            { role: 'user', content: 'busca pan', at: '' },
            { role: 'assistant', content: 'Esto encontré', at: '' },
          ],
          pendingActions: [ACTION],
        },
      });
      await settle();

      expect(q('[data-role="user"]')!.textContent).toContain('busca pan');
      expect(q('#assistant-action-a1')).not.toBeNull();
      expect(q('#assistant-empty')).toBeNull();
    });

    it('"Nueva conversación" empties the panel', async () => {
      await setup();
      await openPanel();
      qa('[id^="assistant-chip-"]')[0].click();
      await sendReply();
      expect(q('#assistant-empty')).toBeNull();

      q('#assistant-new')!.click();
      await settle();
      expect(q('#assistant-empty')).not.toBeNull();
      expect(sessionStorage.getItem(CONVERSATION_KEY)).toBeNull();
    });

    it('logging out discards the conversation and closes the panel', async () => {
      await setup();
      await openPanel();
      qa('[id^="assistant-chip-"]')[0].click();
      await sendReply();

      loggedIn.set(false);
      await settle();

      expect(q('#assistant-panel')).toBeNull();
      expect(sessionStorage.getItem(CONVERSATION_KEY)).toBeNull();
    });
  });

  describe('pending actions', () => {
    async function withAction(type = 'add_to_cart') {
      await setup();
      await openPanel();
      qa('[id^="assistant-chip-"]')[0].click();
      await sendReply({ pendingActions: [{ ...ACTION, type }] });
    }

    it('shows the summary, both buttons and the countdown', async () => {
      await withAction();
      expect(q('#assistant-action-summary-a1')!.textContent).toContain('Agregar 2 kg de Tomate');
      expect(q('#assistant-confirm-a1')).not.toBeNull();
      expect(q('#assistant-reject-a1')).not.toBeNull();
      expect(q('#assistant-action-timer-a1')!.textContent).toMatch(/Vence en (9|10):\d\d/);
    });

    it('disables both buttons while confirming and shows "Confirmada" afterwards', async () => {
      await withAction();
      q('#assistant-confirm-a1')!.click();
      await settle();
      expect(q<HTMLButtonElement>('#assistant-confirm-a1')!.disabled).toBeTrue();
      expect(q<HTMLButtonElement>('#assistant-reject-a1')!.disabled).toBeTrue();

      http.expectOne(`${BASE}/actions/a1/confirm`).flush({ ok: true, message: '', data: { action: {}, result: {} } });
      await settle();
      expect(q('#assistant-confirm-a1')).toBeNull();
      expect(q('#assistant-action-status-a1')!.textContent).toContain('Confirmada');
    });

    it('confirming an order adds the order number with a link to /orders', async () => {
      await withAction('checkout');
      q('#assistant-confirm-a1')!.click();
      http.expectOne(`${BASE}/actions/a1/confirm`).flush({ ok: true, message: '', data: { action: {}, result: { id: 42 } } });
      await settle();

      expect(q('[data-role="event"]')!.textContent).toContain('Pedido #42 creado.');
      expect(q<HTMLAnchorElement>('#assistant-event-link')!.getAttribute('href')).toBe('/orders');
    });

    it('rejecting leaves a "Rechazada" card', async () => {
      await withAction();
      q('#assistant-reject-a1')!.click();
      http.expectOne(`${BASE}/actions/a1/reject`).flush({ ok: true, message: '', data: {} });
      await settle();
      expect(q('#assistant-action-status-a1')!.textContent).toContain('Rechazada');
      expect(q('#assistant-confirm-a1')).toBeNull();
    });

    it('a final error removes the buttons and shows its text', async () => {
      await withAction();
      q('#assistant-confirm-a1')!.click();
      http
        .expectOne(`${BASE}/actions/a1/confirm`)
        .flush({ ok: false, status: 409, message: 'Tu carrito cambió desde que se propuso el pedido.' }, { status: 409, statusText: 'x' });
      await settle();

      expect(q('#assistant-action-status-a1')!.textContent).toContain('Tu carrito cambió desde la propuesta');
      expect(q('#assistant-confirm-a1')).toBeNull();
      expect(q('#assistant-reject-a1')).toBeNull();
    });
  });
});
