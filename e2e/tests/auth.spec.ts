import { test, expect } from '@playwright/test';
import { newUser, registerViaApi } from '../support/api';
import { loginViaUi } from '../support/ui';

test.describe('Registration and login', () => {
  test('a new visitor registers, logs in and lands on the marketplace', async ({ page }) => {
    const user = newUser('signup');

    // Register
    await page.goto('/auth/register');
    await page.getByLabel('Nombre', { exact: true }).fill(user.firstName);
    await page.getByLabel('Apellido').fill(user.lastName);
    await page.getByLabel('Correo electrónico').fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
    await page.getByLabel('Confirmar contraseña').fill(user.password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText('¡Cuenta creada!')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);

    // Log in with the new account
    await page.getByLabel('Correo electrónico').fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('link', { name: 'Carrito' })).toBeVisible();

    // The session is a short access token plus a refresh token
    const stored = await page.evaluate(() => ({
      token: localStorage.getItem('mercadito_token'),
      refresh: localStorage.getItem('mercadito_refresh_token'),
    }));
    expect(stored.token).toBeTruthy();
    expect(stored.refresh).toBeTruthy();
  });

  test('the session survives a page reload', async ({ page, request }) => {
    const user = await registerViaApi(request);
    await loginViaUi(page, user);

    await page.reload();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole('link', { name: 'Carrito' })).toBeVisible();
  });

  test('a registered account cannot be created twice', async ({ page, request }) => {
    const user = await registerViaApi(request);

    await page.goto('/auth/register');
    await page.getByLabel('Nombre', { exact: true }).fill(user.firstName);
    await page.getByLabel('Apellido').fill(user.lastName);
    await page.getByLabel('Correo electrónico').fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
    await page.getByLabel('Confirmar contraseña').fill(user.password);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByText(/already in use/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register$/);
  });

  test('a wrong password shows an error and keeps the visitor on the login page', async ({ page, request }) => {
    const user = await registerViaApi(request);

    await page.goto('/auth/login');
    await page.getByLabel('Correo electrónico').fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill('Otra#Clave9');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    const error = page.getByText(/invalid credentials/i);
    await expect(error).toBeVisible();
    // The message has to stay: a failed login must not reload the page or sign anyone out
    await page.waitForTimeout(1000);
    await expect(error).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test('a protected page sends a guest to the login and comes back after logging in', async ({ page, request }) => {
    const user = await registerViaApi(request);

    await page.goto('/cart');
    await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fcart$/);

    await page.getByLabel('Correo electrónico').fill(user.email);
    await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page).toHaveURL(/\/cart$/);
  });
});
