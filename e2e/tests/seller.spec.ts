import { test, expect } from '@playwright/test';
import { API, getProduct, registerViaApi, seedProduct, unique } from '../support/api';
import { loginViaUi } from '../support/ui';

test.describe('Selling', () => {
  test('a user opens a store and publishes a product', async ({ page, request }) => {
    const owner = await registerViaApi(request);
    await loginViaUi(page, owner);
    const businessName = `Puesto ${unique('s')}`;
    const productName = `Queso ${unique('q')}`;

    // Onboarding: create the store
    await page.goto('/seller/onboarding');
    await page.locator('input[name="businessName"]').fill(businessName);
    await page.locator('input[name="location"]').fill('Pasillo 5');
    await page.getByRole('button', { name: 'Crear mi puesto' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(businessName).first()).toBeVisible();

    // Publish a product
    await page.goto('/dashboard/products/new');
    await page.locator('input[name="name"]').fill(productName);
    await page.locator('select[name="category"]').selectOption('lacteos');
    await page.locator('textarea[name="description"]').fill('Queso fresco artesanal');
    await page.locator('input[name="price"]').fill('18.5');
    await page.locator('select[name="unit"]').selectOption('kilogramo');
    await page.locator('input[name="stock"]').fill('30');
    await page.locator('input[name="image"]').fill('https://example.com/queso.jpg');
    await page.getByRole('button', { name: 'Publicar' }).click();

    // It shows up in the store...
    await expect(page).toHaveURL(/\/dashboard\/products$/);
    await expect(page.getByText(productName)).toBeVisible();

    // ...and in the public catalog
    const catalog = await request.get(`${API}/product`, { params: { name: productName } });
    const found = (await catalog.json()).data as { name: string; stock: number }[];
    expect(found.map((p) => p.name)).toContain(productName);
  });

  test('the seller adjusts stock in the inventory and gets the low stock flag', async ({ page, request }) => {
    const product = await seedProduct(request, { stock: 40 });
    await loginViaUi(page, product.seller);

    await page.goto('/dashboard/inventory');
    const row = page.locator(`#inventory-row-${product.id}`);
    await expect(row).toContainText(product.name);
    await expect(row).toContainText('En stock');

    await expect(page.locator('#inventory-stat-low')).toHaveText('0');

    // Typing a new number marks the row and enables Guardar
    await page.locator(`#stock-${product.id}`).fill('2');
    await expect(page.locator(`#save-${product.id}`)).toBeEnabled();
    await page.locator(`#save-${product.id}`).click();

    await expect(row).toContainText('Stock bajo');
    await expect(page.locator('#inventory-stat-low')).toHaveText('1');
    await expect(page.locator(`#save-${product.id}`)).toBeDisabled();
    expect((await getProduct(request, product.id)).stock).toBe(2);

    // The stepper and the search
    await page.locator(`#plus-${product.id}`).click();
    await expect(page.locator(`#stock-${product.id}`)).toHaveValue('3');
    await page.locator('#inventory-search').fill('no existe ningún producto así');
    await expect(page.locator('#inventory-no-results')).toBeVisible();
    await page.locator('#inventory-clear').click();
    await expect(row).toBeVisible();
  });

  test('the seller turns off a notification type in the settings', async ({ page, request }) => {
    const product = await seedProduct(request);
    await loginViaUi(page, product.seller);

    await page.goto('/dashboard/settings');
    const toggle = page.locator('#toggle-stock\\:low');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // It was saved on the server, not just in the page
    await page.reload();
    await expect(page.locator('#toggle-stock\\:low')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#toggle-order\\:new')).toHaveAttribute('aria-checked', 'true');
  });
});
