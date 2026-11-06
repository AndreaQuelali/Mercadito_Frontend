import { test, expect } from '@playwright/test';
import { getProduct, listNotifications, registerViaApi, seedProduct } from '../support/api';
import { loginViaUi } from '../support/ui';

test.describe('Buying', () => {
  test('a buyer finds a product, adds it to the cart and checks out', async ({ page, request }) => {
    // A seller with a product exists (created through the API)
    const product = await seedProduct(request, { stock: 10, price: 12.5 });
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    // Search from the navbar
    await page.getByPlaceholder('Buscar productos...').fill(product.name);
    await expect(page).toHaveURL(/\/products\?q=/);
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();

    // Open it and add two units
    await page.getByRole('heading', { name: product.name }).click();
    await expect(page).toHaveURL(new RegExp(`/product/${product.id}$`));
    await page.getByRole('button', { name: 'Agregar una unidad' }).click();
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();

    // The cart shows the line and the total (2 x 12.50)
    await page.getByRole('link', { name: 'Carrito' }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
    await expect(page.getByText('Bs 25.00').first()).toBeVisible();

    // Checkout
    await page.getByRole('link', { name: 'Proceder al pago' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();
    await expect(page.getByText(/Orden #\d+/)).toBeVisible();

    // The order is listed as pending
    await page.goto('/orders');
    await expect(page.getByText('Pendiente').first()).toBeVisible();

    // Stock went down by the purchased units
    expect((await getProduct(request, product.id)).stock).toBe(8);
  });

  test('the seller is told about the new order', async ({ page, request }) => {
    const product = await seedProduct(request, { stock: 3 });
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    await page.goto(`/product/${product.id}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('link', { name: 'Carrito' }).click();
    await page.getByRole('link', { name: 'Proceder al pago' }).click();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();

    const types = (await listNotifications(request, product.sellerToken)).map((n) => n.type);
    expect(types).toContain('order:new');
    expect(types).toContain('stock:low'); // 3 - 1 = 2 units left, at or below the threshold
  });

  test('a guest is invited to log in instead of buying', async ({ page, request }) => {
    const product = await seedProduct(request);

    await page.goto(`/product/${product.id}`);

    await expect(page.getByRole('link', { name: 'Inicia sesión para comprar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toHaveCount(0);
  });

  test('an expired access token is renewed without logging the buyer out', async ({ page, request }) => {
    const product = await seedProduct(request);
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    // Swap the access token for one that looks right to the app but that the server rejects
    // (a JWT whose signature is wrong); the refresh token is still valid
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
      sub: 'someone', email: buyer.email, name: 'Ana Prueba', role: 'user', sellerId: null, exp: 1,
    })}.bad-signature`;
    await page.evaluate((t) => localStorage.setItem('mercadito_token', t), forged);
    const before = await page.evaluate(() => localStorage.getItem('mercadito_refresh_token'));

    await page.goto(`/product/${product.id}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('link', { name: 'Carrito' }).click();

    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole('heading', { name: product.name })).toBeVisible();
    const after = await page.evaluate(() => ({
      token: localStorage.getItem('mercadito_token'),
      refresh: localStorage.getItem('mercadito_refresh_token'),
    }));
    expect(after.token).not.toBe(forged); // renewed
    expect(after.refresh).not.toBe(before); // rotated
  });
});

