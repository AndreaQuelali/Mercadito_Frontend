import { test, expect } from '@playwright/test';
import { API, authHeader, getProduct, listNotifications, listSellerOrders, registerViaApi, seedProduct } from '../support/api';
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

  test('a cart with two stands becomes two orders, each stand sees only its own', async ({ page, request }) => {
    const first = await seedProduct(request, { stock: 5, price: 10 });
    const second = await seedProduct(request, { stock: 5, price: 4 });
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    for (const product of [first, second]) {
      await page.goto(`/product/${product.id}`);
      await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    }
    await page.getByRole('link', { name: 'Carrito' }).click();
    await page.getByRole('link', { name: 'Proceder al pago' }).click();

    // The summary is grouped by stand
    await expect(page.locator('[data-seller]')).toHaveCount(2);
    await expect(page.getByText('Tu compra tiene productos de 2 puestos')).toBeVisible();

    // Delivery asks for an address and a reference
    await page.getByLabel('Entrega a domicilio').check();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByText('La dirección es obligatoria.')).toBeVisible();
    await expect(page.getByText('La referencia es obligatoria.')).toBeVisible();
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toHaveCount(0);

    await page.getByLabel('Dirección', { exact: true }).fill('Av. Siempre Viva 123');
    await page.getByLabel('Referencia').fill('Portón verde');
    await page.getByLabel('Teléfono de contacto').fill('+591 70012345');
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();
    await expect(page.getByText(/Orden #\d+/)).toHaveCount(2);

    // /orders shows one purchase with one order per stand and the delivery address
    await page.goto('/orders');
    await expect(page.locator('[data-checkout]')).toHaveCount(1);
    await expect(page.getByText(/Orden #\d+/)).toHaveCount(2);
    await expect(page.getByText(/Entrega en: Av\. Siempre Viva 123/).first()).toBeVisible();

    // Each seller sees only their order, with the delivery data
    const [mineA] = await listSellerOrders(request, first.sellerToken);
    const sellerOrdersB = await listSellerOrders(request, second.sellerToken);
    expect(sellerOrdersB).toHaveLength(1);
    expect(mineA.items.map((i) => i.productId)).toEqual([first.id]);
    expect(mineA).toMatchObject({ fulfillment: 'delivery', address: 'Av. Siempre Viva 123', addressRef: 'Portón verde', contactPhone: '+591 70012345' });
    expect(mineA.checkoutId).toBe(sellerOrdersB[0].checkoutId);

    // A seller cannot change the status of another stand's order
    const forbidden = await request.patch(`${API}/order/${sellerOrdersB[0].id}/status`, {
      headers: authHeader(first.sellerToken),
      data: { status: 'confirmed' },
    });
    expect(forbidden.status()).toBe(403);
  });

  test('the seller panel shows how to deliver the order', async ({ page, request, browser }) => {
    const product = await seedProduct(request);
    const buyer = await registerViaApi(request);
    await loginViaUi(page, buyer);

    await page.goto(`/product/${product.id}`);
    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await page.getByRole('link', { name: 'Carrito' }).click();
    await page.getByRole('link', { name: 'Proceder al pago' }).click();
    await page.getByLabel('Entrega a domicilio').check();
    await page.getByLabel('Dirección', { exact: true }).fill('Calle Comercio 45');
    await page.getByLabel('Referencia').fill('Casa azul');
    await page.getByLabel('Teléfono de contacto').fill('70099999');
    await page.getByLabel('Nota para el puesto').fill('Llamar al llegar');
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();

    // The seller logs in from their own browser session
    const sellerPage = await (await browser.newContext()).newPage();
    await loginViaUi(sellerPage, product.seller);
    await sellerPage.goto('/dashboard/orders');
    const card = sellerPage.locator('[data-fulfillment="delivery"]').first();
    await expect(card).toContainText('Entrega a domicilio');
    await expect(card).toContainText('Calle Comercio 45');
    await expect(card).toContainText('Casa azul');
    await expect(card).toContainText('70099999');
    await expect(card).toContainText('Llamar al llegar');
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

