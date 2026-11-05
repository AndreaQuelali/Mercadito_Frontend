import { test, expect, Page } from '@playwright/test';
import { API, authHeader, loginViaApi, registerViaApi, seedProduct, unique } from '../support/api';
import { loginViaUi } from '../support/ui';

// The backend runs with LLM_PROVIDER=fake (a scripted model, no OpenAI) and EMBEDDINGS_PROVIDER=fake:
//   "agrega 2 <palabra>" -> proposes add_to_cart · "hazme el pedido" -> proposes checkout · "carrito" -> reads the cart

const NOTICE_KEY = 'mercadito_assistant_notice_v1';
const CONVERSATION_KEY = 'mercadito_assistant_conversation';

type Api = Parameters<typeof seedProduct>[0];

/** The privacy notice has its own test; everything else starts with it accepted */
async function acceptNoticeInAdvance(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, 'accepted'), NOTICE_KEY);
}

async function openAssistant(page: Page) {
  await page.locator('#assistant-launcher').click();
  await expect(page.getByRole('dialog', { name: 'Asistente de compras' })).toBeVisible();
}

async function say(page: Page, text: string) {
  const input = page.locator('#assistant-input');
  await input.fill(text);
  await input.press('Enter');
}

/** A product whose name holds a word nothing else in the shared database has */
async function seedUniqueProduct(request: Api, stock = 20) {
  const word = unique('tomate').replace(/-/g, '');
  const product = await seedProduct(request, { name: `${word} cherry`, description: `${word} fresco`, stock, price: 12.5 });
  return { word, product };
}

async function cartOf(request: Api, token: string) {
  const res = await request.get(`${API}/cart`, { headers: authHeader(token) });
  expect(res.status(), 'get cart').toBe(200);
  return (await res.json()).data.items as { productId: number; quantity: number }[];
}

test.describe('Shopping assistant (UI)', () => {
  test('a guest sees the button, is sent to the login and comes back to the same page', async ({ page, request }) => {
    const buyer = await registerViaApi(request);
    await page.goto('/products');
    await openAssistant(page);

    await expect(page.locator('#assistant-guest')).toContainText('Inicia sesión');
    await expect(page.locator('#assistant-input')).toHaveCount(0);
    await page.locator('#assistant-login-link').click();
    await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fproducts$/);

    await page.getByLabel('Correo electrónico').fill(buyer.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(buyer.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(page.locator('#assistant-launcher')).toBeVisible();
  });

  test('the button only appears on the marketplace pages', async ({ page, request }) => {
    const buyer = await registerViaApi(request);
    await page.goto('/');
    await expect(page.locator('#assistant-launcher')).toHaveCount(0);
    await page.goto('/auth/login');
    await expect(page.locator('#assistant-launcher')).toHaveCount(0);

    await loginViaUi(page, buyer);
    for (const path of ['/home', '/products', '/cart', '/checkout', '/orders']) {
      await page.goto(path);
      await expect(page.locator('#assistant-launcher'), path).toBeVisible();
    }
    const product = await seedProduct(request);
    await page.goto(`/product/${product.id}`);
    await expect(page.locator('#assistant-launcher')).toBeVisible();
  });

  test('the privacy notice is shown once and then stays as a footer line', async ({ page, request }) => {
    await loginViaUi(page, await registerViaApi(request));
    await openAssistant(page);

    await expect(page.locator('#assistant-notice')).toContainText('OpenAI');
    await expect(page.locator('#assistant-input')).toHaveCount(0);
    await page.getByRole('button', { name: 'Entendido' }).click();
    await expect(page.locator('#assistant-notice')).toHaveCount(0);
    await expect(page.locator('#assistant-input')).toBeFocused();

    await page.reload();
    await openAssistant(page);
    await expect(page.locator('#assistant-notice')).toHaveCount(0);
    await expect(page.locator('#assistant-privacy-line')).toBeVisible();
  });

  test('a chip sends its message and the reply shows up', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    await loginViaUi(page, await registerViaApi(request));
    await openAssistant(page);

    await expect(page.locator('[id^="assistant-chip-"]')).toHaveCount(4);
    await page.getByRole('button', { name: '¿Qué tengo en mi carrito?' }).click();
    await expect(page.locator('[data-role="user"]')).toHaveText('¿Qué tengo en mi carrito?');
    await expect(page.locator('[data-role="assistant"]')).toContainText('Este es tu carrito.');
    await expect(page.locator('#assistant-empty')).toHaveCount(0);
  });

  test('"agrega 2 ..." shows a card; confirming updates the navbar counter and the cart', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    const { word, product } = await seedUniqueProduct(request);
    const buyer = await registerViaApi(request);
    const { token } = await loginViaApi(request, buyer);
    await loginViaUi(page, buyer);
    await openAssistant(page);

    await say(page, `agrega 2 ${word}`);
    const card = page.locator('[data-state]').first();
    await expect(card).toContainText('Bs 25.00');
    await expect(page.locator(`#assistant-product-${product.id}`)).toBeVisible();
    await expect(page.locator('.cart-badge')).toHaveCount(0);
    expect(await cartOf(request, token)).toEqual([]);

    await page.getByRole('button', { name: 'Confirmar' }).click();
    await expect(card).toContainText('Confirmada');
    await expect(page.locator('.cart-badge')).toHaveText('2');
    expect(await cartOf(request, token)).toMatchObject([{ productId: product.id, quantity: 2 }]);

    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: `${word} cherry` })).toBeVisible();
  });

  test('rejecting leaves the cart as it was', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    const { word } = await seedUniqueProduct(request);
    const buyer = await registerViaApi(request);
    const { token } = await loginViaApi(request, buyer);
    await loginViaUi(page, buyer);
    await openAssistant(page);

    await say(page, `agrega 1 ${word}`);
    await page.getByRole('button', { name: 'Rechazar' }).click();
    await expect(page.locator('[data-state="rejected"]')).toContainText('Rechazada');
    await expect(page.locator('.cart-badge')).toHaveCount(0);
    expect(await cartOf(request, token)).toEqual([]);
  });

  test('reloading resumes the conversation, and "Nueva conversación" empties it', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    const { word } = await seedUniqueProduct(request);
    await loginViaUi(page, await registerViaApi(request));
    await openAssistant(page);
    await say(page, `agrega 1 ${word}`);
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();

    await page.reload();
    await openAssistant(page);
    await expect(page.locator('[data-role="user"]')).toContainText(`agrega 1 ${word}`);
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();

    await page.locator('#assistant-new').click();
    await expect(page.locator('#assistant-empty')).toBeVisible();
    await expect(page.locator('[data-role="user"]')).toHaveCount(0);

    await page.reload();
    await openAssistant(page);
    await expect(page.locator('#assistant-empty')).toBeVisible();
  });

  test('logging out discards the conversation', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);
    await openAssistant(page);
    await say(page, 'carrito');
    await expect(page.locator('[data-role="assistant"]')).toBeVisible();
    expect(await page.evaluate((k) => sessionStorage.getItem(k), CONVERSATION_KEY)).not.toBeNull();

    await page.keyboard.press('Escape');
    await page.locator('.user-menu__trigger').click();
    await page.locator('.user-menu__logout').click();
    await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), CONVERSATION_KEY)).toBeNull();

    await loginViaUi(page, buyer);
    await openAssistant(page);
    await expect(page.locator('#assistant-empty')).toBeVisible();
  });

  test('an order proposal is refused with the "cart changed" message if the cart changed meanwhile', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    const { product } = await seedUniqueProduct(request);
    const buyer = await registerViaApi(request);
    const { token } = await loginViaApi(request, buyer);
    const add = () =>
      request.post(`${API}/cart/add`, { headers: authHeader(token), data: { productId: product.id, quantity: 1 } });
    expect((await add()).status()).toBe(200);

    await loginViaUi(page, buyer);
    await openAssistant(page);
    await say(page, 'hazme el pedido');
    await expect(page.getByRole('button', { name: 'Confirmar' })).toBeVisible();

    // "Another tab" changes the cart behind the proposal
    expect((await add()).status()).toBe(200);
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.locator('[data-state="failed"]')).toContainText('Tu carrito cambió desde la propuesta');
    await expect(page.getByRole('button', { name: 'Confirmar' })).toHaveCount(0);
    expect((await cartOf(request, token))[0].quantity).toBe(2);
  });

  test('confirming an order shows its number with a link to /orders', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    const { product } = await seedUniqueProduct(request, 5);
    const buyer = await registerViaApi(request);
    const { token } = await loginViaApi(request, buyer);
    await request.post(`${API}/cart/add`, { headers: authHeader(token), data: { productId: product.id, quantity: 2 } });

    await loginViaUi(page, buyer);
    await openAssistant(page);
    await say(page, 'hazme el pedido');
    await page.getByRole('button', { name: 'Confirmar' }).click();

    await expect(page.locator('[data-role="event"]')).toContainText(/Pedido #\d+ creado/);
    await expect(page.locator('.cart-badge')).toHaveCount(0);
    await page.locator('#assistant-event-link').click();
    await expect(page).toHaveURL(/\/orders$/);
  });

  test('Esc closes the panel and returns the focus to the button', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    await loginViaUi(page, await registerViaApi(request));
    await openAssistant(page);
    await expect(page.locator('#assistant-input')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#assistant-panel')).toHaveCount(0);
    await expect(page.locator('#assistant-launcher')).toBeFocused();
  });

  test('on a phone the panel fills the screen, also in dark mode', async ({ page, request }) => {
    await acceptNoticeInAdvance(page);
    await page.setViewportSize({ width: 375, height: 760 });
    await loginViaUi(page, await registerViaApi(request));
    await openAssistant(page);

    const box = (await page.locator('#assistant-panel').boundingBox())!;
    expect(Math.round(box.width)).toBe(375);
    expect(Math.round(box.height)).toBe(760);

    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    const background = await page.locator('#assistant-panel').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe('rgb(39, 30, 26)'); // --color-bg-surface in dark mode (#271E1A)
  });
});
