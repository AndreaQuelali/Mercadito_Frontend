import { test, expect } from '@playwright/test';
import {
  API,
  authHeader,
  checkoutViaApi,
  configureSellerPayment,
  listSellerOrders,
  loginViaApi,
  registerViaApi,
  seedProduct,
} from '../support/api';
import { loginViaUi } from '../support/ui';

const INSTRUCTIONS = 'Banco Union, cuenta 123-456, titular Ana';

test.describe('Payments', () => {
  test('QR payment: proof, rejection with reason, new proof, confirmation', async ({ page, request, browser }) => {
    const product = await seedProduct(request, { price: 12.5 });
    await configureSellerPayment(request, product.sellerToken, { acceptsQr: true, paymentInstructions: INSTRUCTIONS });
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    // Checkout offers both methods; the buyer picks QR
    await page.goto(`/product/${product.id}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('link', { name: 'Carrito' }).click();
    await page.getByRole('link', { name: 'Proceder al pago' }).click();
    await expect(page.getByLabel('Pago contra entrega')).toBeChecked();
    await page.getByLabel('QR o transferencia').check();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();

    // Payment screen: exact amount, instructions, proof upload
    await page.getByRole('link', { name: 'Pagar' }).click();
    await expect(page.locator('#pay-amount')).toContainText('Bs 12.50');
    await expect(page.locator('#pay-instructions')).toContainText(INSTRUCTIONS);
    await page.getByLabel('Enlace de tu comprobante').fill('https://example.com/comprobante-1.jpg');
    await page.getByRole('button', { name: 'Enviar comprobante' }).click();
    await expect(page.locator('#pay-waiting')).toBeVisible();

    // The seller sees the proof and rejects it with a reason (own browser session)
    const sellerPage = await (await browser.newContext()).newPage();
    await loginViaUi(sellerPage, product.seller);
    await sellerPage.goto('/dashboard/orders');
    const card = sellerPage.locator('[data-payment="proof_uploaded"]').first();
    await expect(card).toContainText('QR o transferencia');
    await expect(card.getByRole('link', { name: 'Ver comprobante' })).toHaveAttribute('href', 'https://example.com/comprobante-1.jpg');
    await card.getByRole('button', { name: 'Rechazar' }).click();
    await sellerPage.getByLabel('Motivo del rechazo').fill('El monto no coincide');
    await sellerPage.getByRole('button', { name: 'Enviar rechazo' }).click();
    await expect(sellerPage.locator('[data-payment="rejected"]').first()).toBeVisible();

    // The buyer sees the reason and uploads another proof
    await page.reload();
    await expect(page.locator('#pay-rejected')).toContainText('El monto no coincide');
    await page.getByLabel('Enlace de tu comprobante').fill('https://example.com/comprobante-2.jpg');
    await page.getByRole('button', { name: 'Enviar comprobante' }).click();
    await expect(page.locator('#pay-waiting')).toBeVisible();

    // The seller confirms: the order becomes paid
    await sellerPage.reload();
    await sellerPage.getByRole('button', { name: 'Confirmar pago' }).click();
    await expect(sellerPage.locator('[data-payment="paid"]').first()).toBeVisible();
    const [order] = await listSellerOrders(request, product.sellerToken);
    expect(order).toMatchObject({ status: 'paid', paymentStatus: 'paid', paymentMethod: 'qr_transfer' });

    await page.reload();
    await expect(page.getByText('Pago confirmado')).toBeVisible();
  });

  test('cash on delivery: the seller marks the order collected', async ({ page, request, browser }) => {
    const product = await seedProduct(request);
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    await page.goto(`/product/${product.id}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('link', { name: 'Carrito' }).click();
    await page.getByRole('link', { name: 'Proceder al pago' }).click();
    // A stand that accepts cash only offers no QR
    await expect(page.getByLabel('QR o transferencia')).toHaveCount(0);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Pagar' })).toHaveCount(0);

    const sellerPage = await (await browser.newContext()).newPage();
    await loginViaUi(sellerPage, product.seller);
    await sellerPage.goto('/dashboard/orders');
    await expect(sellerPage.getByText('Pago contra entrega').first()).toBeVisible();
    await sellerPage.getByRole('button', { name: 'Marcar cobrado' }).click();
    await expect(sellerPage.locator('[data-payment="paid"]').first()).toBeVisible();

    await page.goto('/orders');
    await expect(page.getByText('Pago confirmado')).toBeVisible();
  });

  test('a purchase only offers the methods every stand accepts', async ({ page, request }) => {
    const qrStand = await seedProduct(request);
    await configureSellerPayment(request, qrStand.sellerToken, { acceptsQr: true, paymentInstructions: INSTRUCTIONS });
    const cashStand = await seedProduct(request);
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    for (const product of [qrStand, cashStand]) {
      await page.goto(`/product/${product.id}`);
      await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    }
    await page.getByRole('link', { name: 'Carrito' }).click();
    await page.getByRole('link', { name: 'Proceder al pago' }).click();

    await expect(page.getByLabel('Pago contra entrega')).toBeVisible();
    await expect(page.getByLabel('QR o transferencia')).toHaveCount(0);
  });

  test('the API refuses a method a stand does not accept, and strangers', async ({ request }) => {
    const mine = await seedProduct(request, { stock: 5 });
    const other = await seedProduct(request, { stock: 5 });
    const buyer = await registerViaApi(request);
    const { token } = await loginViaApi(request, buyer);

    // QR is not accepted by this stand: nothing is created
    const refused = await checkoutViaApi(request, token, [mine.id], { fulfillment: 'pickup', paymentMethod: 'qr_transfer' });
    expect(refused.status).toBe(400);
    // The orders endpoint answers 400 "Orders not found" while the stand has none
    expect((await request.get(`${API}/order/seller/mine`, { headers: authHeader(mine.sellerToken) })).status()).toBe(400);

    // A valid purchase of a QR stand (the cart still holds the product)
    await configureSellerPayment(request, mine.sellerToken, { acceptsQr: true, paymentInstructions: INSTRUCTIONS });
    const ok = await request.post(`${API}/cart/checkout`, {
      headers: authHeader(token),
      data: { fulfillment: 'pickup', paymentMethod: 'qr_transfer' },
    });
    expect(ok.status()).toBe(201);
    const orderId = (await ok.json()).data.orders[0].id as number;

    // Another seller cannot confirm it; another buyer cannot upload a proof to it
    const forbidden = await request.patch(`${API}/order/${orderId}/payment`, {
      headers: authHeader(other.sellerToken),
      data: { action: 'confirm' },
    });
    expect(forbidden.status()).toBe(403);
    const stranger = await loginViaApi(request, await registerViaApi(request));
    const notMine = await request.post(`${API}/order/${orderId}/payment-proof`, {
      headers: authHeader(stranger.token),
      data: { url: 'https://example.com/p.jpg' },
    });
    expect(notMine.status()).toBe(404);

    // The owner seller cannot confirm before a proof exists
    const early = await request.patch(`${API}/order/${orderId}/payment`, {
      headers: authHeader(mine.sellerToken),
      data: { action: 'confirm' },
    });
    expect(early.status()).toBe(409);
  });
});
