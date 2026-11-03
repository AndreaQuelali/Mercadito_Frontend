import { Page, expect } from '@playwright/test';
import { TestUser } from './api';

/** Fills the login form and waits until the app lands on the marketplace */
export async function loginViaUi(page: Page, user: Pick<TestUser, 'email' | 'password'>) {
  await page.goto('/auth/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/home$/);
}
