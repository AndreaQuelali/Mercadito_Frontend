import { test, expect, APIRequestContext } from '@playwright/test';
import {
  API,
  authHeader,
  checkoutViaApi,
  getProduct,
  listSellerOrders,
  loginViaApi,
  registerViaApi,
  seedProduct,
} from '../support/api';
import { loginViaUi } from '../support/ui';

/** A buyer with a pending order of one unit of a fresh product (stock 5 -> 4) */
async function pendingOrder(request: APIRequestContext) {
  const product = await seedProduct(request, { stock: 5 });
  const buyer = await registerViaApi(request);
  const { token } = await loginViaApi(request, buyer);
  const bought = await checkoutViaApi(request, token, [product.id], { fulfillment: 'pickup' });
  expect(bought.status).toBe(201);
  const orderId = bought.json.data.orders[0].id as number;
  expect((await getProduct(request, product.id)).stock).toBe(4);
  return { product, buyer, token, orderId };
}

const setStatus = (request: APIRequestContext, token: string, orderId: number, body: Record<string, unknown>) =>
  request.patch(`${API}/order/${orderId}/status`, { headers: authHeader(token), data: body });

test.describe('Order lifecycle', () => {
  test('the buyer cancels a pending order and the stock comes back', async ({ page, request }) => {
    const { product, buyer } = await pendingOrder(request);
    await loginViaUi(page, buyer);

    await page.goto('/orders');
    await page.getByRole('button', { name: 'Cancelar pedido' }).click();
    // Nothing happens until the buyer confirms
    await expect(page.getByText(/¿Seguro que quieres cancelar/)).toBeVisible();
    expect((await getProduct(request, product.id)).stock).toBe(4);

    await page.getByLabel('Motivo (opcional)').fill('Me equivoqué de producto');
    await page.getByRole('button', { name: 'Sí, cancelar pedido' }).click();

    await expect(page.locator('[data-cancelled]')).toContainText('Me equivoqué de producto');
    await expect(page.getByRole('button', { name: 'Cancelar pedido' })).toHaveCount(0);
    await page.getByText('Historial').click();
    await expect(page.locator('.order-history-item')).toContainText('Cancelado');
    expect((await getProduct(request, product.id)).stock).toBe(5);
  });

  test('the seller cancels with a reason that the buyer sees', async ({ page, request, browser }) => {
    const { product, buyer } = await pendingOrder(request);

    const sellerPage = await (await browser.newContext()).newPage();
    await loginViaUi(sellerPage, product.seller);
    await sellerPage.goto('/dashboard/orders');
    await sellerPage.getByRole('button', { name: 'Cancelar', exact: true }).click();
    // The reason is mandatory
    await expect(sellerPage.getByRole('button', { name: 'Cancelar pedido' })).toBeDisabled();
    await sellerPage.getByLabel('Motivo de la cancelación (obligatorio)').fill('Se agotó el producto');
    await sellerPage.getByRole('button', { name: 'Cancelar pedido' }).click();
    await expect(sellerPage.getByText('Cancelado').first()).toBeVisible();
    expect((await getProduct(request, product.id)).stock).toBe(5);

    await loginViaUi(page, buyer);
    await page.goto('/orders');
    await expect(page.locator('[data-cancelled]')).toContainText('Se agotó el producto');
  });

  test('the server enforces the state machine', async ({ request }) => {
    const { product, token, orderId } = await pendingOrder(request);
    const other = await seedProduct(request);

    // No skipping steps, no cancelling without a reason, nobody else's order
    expect((await setStatus(request, product.sellerToken, orderId, { status: 'shipped' })).status()).toBe(409);
    expect((await setStatus(request, product.sellerToken, orderId, { status: 'cancelled' })).status()).toBe(400);
    expect((await setStatus(request, other.sellerToken, orderId, { status: 'confirmed' })).status()).toBe(403);

    // A buyer cannot move an order forward (the seller route refuses them)
    expect((await setStatus(request, token, orderId, { status: 'confirmed' })).status()).toBe(403);

    // The seller walks the whole flow; the buyer cannot cancel once it is confirmed
    expect((await setStatus(request, product.sellerToken, orderId, { status: 'confirmed' })).status()).toBe(200);
    const late = await request.post(`${API}/order/${orderId}/cancel`, { headers: authHeader(token), data: {} });
    expect(late.status()).toBe(409);
    expect((await setStatus(request, product.sellerToken, orderId, { status: 'pending' })).status()).toBe(409);
    expect((await setStatus(request, product.sellerToken, orderId, { status: 'shipped' })).status()).toBe(200);
    expect((await setStatus(request, product.sellerToken, orderId, { status: 'delivered' })).status()).toBe(200);

    // Delivered is final, and the stock was never given back
    expect((await setStatus(request, product.sellerToken, orderId, { status: 'cancelled', reason: 'tarde' })).status()).toBe(409);
    expect((await getProduct(request, product.id)).stock).toBe(4);

    // Every change is in the history
    const [order] = await listSellerOrders(request, product.sellerToken);
    const events = (order as unknown as { events: { from: string; to: string; actorRole: string }[] }).events;
    expect(events.map((e) => `${e.from}>${e.to}`)).toEqual([
      'pending>confirmed',
      'confirmed>shipped',
      'shipped>delivered',
    ]);
    expect(events.every((e) => e.actorRole === 'seller')).toBe(true);
  });

  test('two cancellations at the same time give the stock back once', async ({ request }) => {
    const { product, token, orderId } = await pendingOrder(request);

    const results = await Promise.all([
      request.post(`${API}/order/${orderId}/cancel`, { headers: authHeader(token), data: {} }),
      request.post(`${API}/order/${orderId}/cancel`, { headers: authHeader(token), data: {} }),
      setStatus(request, product.sellerToken, orderId, { status: 'cancelled', reason: 'a la vez' }),
    ]);

    const codes = results.map((r) => r.status()).sort();
    expect(codes).toEqual([200, 409, 409]);
    expect((await getProduct(request, product.id)).stock).toBe(5); // 4 + 1, not 4 + 3
  });
});
