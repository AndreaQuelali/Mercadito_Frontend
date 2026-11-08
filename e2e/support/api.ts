import { APIRequestContext, expect } from '@playwright/test';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const stack = require('../stack.json') as { apiPort: number };

export const API = `http://localhost:${stack.apiPort}`;

/** Meets the password policy of the backend (8+, uppercase, digit, symbol) */
export const PASSWORD = 'Secreto#123';

/** A value that never repeats across runs, so tests can share one database */
export const unique = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export interface TestUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export function newUser(prefix = 'user'): TestUser {
  const id = unique(prefix);
  return { firstName: 'Ana', lastName: 'Prueba', email: `${id}@e2e.test`, password: PASSWORD };
}

/** Creates the account through the API (faster than the form when registering is not the point) */
export async function registerViaApi(request: APIRequestContext, user = newUser()): Promise<TestUser> {
  const res = await request.post(`${API}/auth/register`, { data: user });
  expect(res.status(), 'register').toBe(201);
  return user;
}

export async function loginViaApi(request: APIRequestContext, user: TestUser) {
  const res = await request.post(`${API}/auth/login`, { data: { email: user.email, password: user.password } });
  expect(res.status(), 'login').toBe(200);
  const body = await res.json();
  return { token: body.data.token as string, refreshToken: body.data.refreshToken as string };
}

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface SeededProduct {
  id: number;
  name: string;
  stock: number;
  /** Access token that already carries the sellerId */
  sellerToken: string;
  /** Credentials of the owner, for logging in through the UI */
  seller: TestUser;
}

/** A seller with one published product, created through the API */
export async function seedProduct(
  request: APIRequestContext,
  overrides: Partial<{ name: string; price: number; stock: number; category: string; description: string }> = {}
): Promise<SeededProduct> {
  const seller = await registerViaApi(request, newUser('seller'));
  const { token } = await loginViaApi(request, seller);

  const created = await request.post(`${API}/seller`, {
    headers: authHeader(token),
    data: { businessName: `Puesto ${unique('p')}`, location: 'Pasillo 3' },
  });
  expect(created.status(), 'create seller').toBe(201);
  // The response carries a new access token that already includes the sellerId
  const sellerToken = (await created.json()).token as string;

  const name = overrides.name ?? `Tomate ${unique('t')}`;
  const stock = overrides.stock ?? 25;
  const product = await request.post(`${API}/product`, {
    headers: authHeader(sellerToken),
    data: {
      name,
      price: overrides.price ?? 12.5,
      stock,
      unit: 'kilogramo',
      category: overrides.category ?? 'verduras',
      description: overrides.description ?? 'Tomate fresco de valle',
      image: 'https://example.com/tomate.jpg',
    },
  });
  expect(product.status(), 'create product').toBe(201);
  return { id: (await product.json()).data.id as number, name, stock, sellerToken, seller };
}

export async function getProduct(request: APIRequestContext, id: number) {
  const res = await request.get(`${API}/product/${id}`);
  expect(res.status(), 'get product').toBe(200);
  return (await res.json()).data as { id: number; name: string; stock: number };
}

export async function listNotifications(request: APIRequestContext, token: string) {
  const res = await request.get(`${API}/notification`, { headers: authHeader(token) });
  expect(res.status(), 'list notifications').toBe(200);
  return (await res.json()).data.items as { type: string; payload: Record<string, unknown> }[];
}

export interface SellerOrder {
  id: number;
  status: string;
  total: string;
  checkoutId: string;
  fulfillment: 'pickup' | 'delivery';
  address: string | null;
  addressRef: string | null;
  contactPhone: string;
  items: { productId: number }[];
}

/** Orders of the seller's own stand */
export async function listSellerOrders(request: APIRequestContext, sellerToken: string) {
  const res = await request.get(`${API}/order/seller/mine`, { headers: authHeader(sellerToken) });
  expect(res.status(), 'list seller orders').toBe(200);
  return (await res.json()).data as SellerOrder[];
}
