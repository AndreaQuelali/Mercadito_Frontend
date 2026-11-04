import { test, expect, APIRequestContext } from '@playwright/test';
import { API, authHeader, loginViaApi, registerViaApi, seedProduct, unique } from '../support/api';

// The backend runs with LLM_PROVIDER=fake: a scripted model that reacts to keywords
// ("agrega 2 <palabra>", "pedido", "cambia <itemId> a N") instead of calling OpenAI.

interface Reply {
  conversationId: string;
  reply: string;
  products: { id: number }[];
  pendingActions: { id: string; type: string; summary: string }[];
}

/** A buyer with a session; each test gets its own so the per-user limit and carts never interfere */
async function newBuyerToken(request: APIRequestContext): Promise<string> {
  const buyer = await registerViaApi(request);
  return (await loginViaApi(request, buyer)).token;
}

async function say(request: APIRequestContext, token: string, message: string, conversationId?: string) {
  const res = await request.post(`${API}/assistant/messages`, {
    headers: authHeader(token),
    data: { message, conversationId },
  });
  expect(res.status(), `message "${message}"`).toBe(200);
  return (await res.json()).data as Reply;
}

async function cartOf(request: APIRequestContext, token: string) {
  const res = await request.get(`${API}/cart`, { headers: authHeader(token) });
  expect(res.status(), 'get cart').toBe(200);
  return (await res.json()).data.items as { id: number; productId: number; quantity: number }[];
}

const confirm = (request: APIRequestContext, token: string, id: string) =>
  request.post(`${API}/assistant/actions/${id}/confirm`, { headers: authHeader(token) });
const reject = (request: APIRequestContext, token: string, id: string) =>
  request.post(`${API}/assistant/actions/${id}/reject`, { headers: authHeader(token) });

/** A product whose name holds a word nothing else in the shared database has */
async function seedUniqueProduct(request: APIRequestContext, stock = 20) {
  const word = unique('tomate').replace(/-/g, '');
  const product = await seedProduct(request, { name: `${word} cherry`, description: `${word} fresco`, stock, price: 12.5 });
  return { word, product };
}

test.describe('Shopping assistant (API)', () => {
  test('is enabled and requires a session', async ({ request }) => {
    expect((await request.get(`${API}/assistant/status`)).status()).toBe(401);
    expect((await request.post(`${API}/assistant/messages`, { data: { message: 'hola' } })).status()).toBe(401);

    const token = await newBuyerToken(request);
    const status = await request.get(`${API}/assistant/status`, { headers: authHeader(token) });
    expect((await status.json()).data).toEqual({ enabled: true, model: 'fake' });
  });

  test('"agrega 2 ..." proposes an action, the cart stays empty until it is confirmed', async ({ request }) => {
    const { word, product } = await seedUniqueProduct(request);
    const token = await newBuyerToken(request);

    const reply = await say(request, token, `agrega 2 ${word}`);
    expect(reply.pendingActions).toHaveLength(1);
    expect(reply.pendingActions[0].type).toBe('add_to_cart');
    expect(reply.pendingActions[0].summary).toContain('Bs 25.00');
    expect(reply.products.map((p) => p.id)).toContain(product.id);
    expect(await cartOf(request, token)).toEqual([]);

    const res = await confirm(request, token, reply.pendingActions[0].id);
    expect(res.status()).toBe(200);
    const items = await cartOf(request, token);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: product.id, quantity: 2 });
  });

  test('rejecting changes nothing, and the action cannot be confirmed afterwards', async ({ request }) => {
    const { word } = await seedUniqueProduct(request);
    const token = await newBuyerToken(request);
    const reply = await say(request, token, `agrega 1 ${word}`);
    const id = reply.pendingActions[0].id;

    expect((await reject(request, token, id)).status()).toBe(200);
    expect(await cartOf(request, token)).toEqual([]);
    expect((await confirm(request, token, id)).status()).toBe(409);
    expect(await cartOf(request, token)).toEqual([]);
  });

  test('a second confirmation answers 409 and does not add twice', async ({ request }) => {
    const { word } = await seedUniqueProduct(request);
    const token = await newBuyerToken(request);
    const id = (await say(request, token, `agrega 2 ${word}`)).pendingActions[0].id;

    expect((await confirm(request, token, id)).status()).toBe(200);
    expect((await confirm(request, token, id)).status()).toBe(409);
    expect((await cartOf(request, token))[0].quantity).toBe(2);
  });

  test('a checkout proposal is refused with 409 if the cart changed before confirming', async ({ request }) => {
    const { product } = await seedUniqueProduct(request);
    const token = await newBuyerToken(request);

    // The cart gets its item through the API, then the assistant proposes the order
    const added = await request.post(`${API}/cart/add`, { headers: authHeader(token), data: { productId: product.id, quantity: 1 } });
    expect(added.status()).toBe(200);
    const order = await say(request, token, 'hazme el pedido');
    expect(order.pendingActions[0].type).toBe('checkout');

    // The cart changes behind the proposal
    const more = await request.post(`${API}/cart/add`, { headers: authHeader(token), data: { productId: product.id, quantity: 1 } });
    expect(more.status()).toBe(200);

    expect((await confirm(request, token, order.pendingActions[0].id)).status()).toBe(409);
    const orders = await request.get(`${API}/order`, { headers: authHeader(token) });
    // The orders endpoint answers 400 "Orders not found" when the user has none
    expect(orders.status()).toBe(400);
    expect((await cartOf(request, token))[0].quantity).toBe(2);
  });

  test('confirming a checkout with the same cart creates the order', async ({ request }) => {
    const { product } = await seedUniqueProduct(request, 5);
    const token = await newBuyerToken(request);
    await request.post(`${API}/cart/add`, { headers: authHeader(token), data: { productId: product.id, quantity: 2 } });

    const order = await say(request, token, 'hazme el pedido');
    const res = await confirm(request, token, order.pendingActions[0].id);
    expect(res.status()).toBe(200);
    expect((await res.json()).data.result).toMatchObject({ status: 'pending' });
    expect(await cartOf(request, token)).toEqual([]);
  });

  test("another user's action answers 404 and does nothing", async ({ request }) => {
    const { word } = await seedUniqueProduct(request);
    const owner = await newBuyerToken(request);
    const intruder = await newBuyerToken(request);
    const id = (await say(request, owner, `agrega 1 ${word}`)).pendingActions[0].id;

    expect((await confirm(request, intruder, id)).status()).toBe(404);
    expect((await reject(request, intruder, id)).status()).toBe(404);
    expect(await cartOf(request, owner)).toEqual([]);
    // It is still the owner's to confirm
    expect((await confirm(request, owner, id)).status()).toBe(200);
  });

  test("another user's conversation answers 404", async ({ request }) => {
    const owner = await newBuyerToken(request);
    const intruder = await newBuyerToken(request);
    const { conversationId } = await say(request, owner, 'hola');
    const res = await request.post(`${API}/assistant/messages`, {
      headers: authHeader(intruder),
      data: { message: 'hola', conversationId },
    });
    expect(res.status()).toBe(404);
  });

  test('rejects an empty message and one over 1000 characters', async ({ request }) => {
    const token = await newBuyerToken(request);
    for (const message of ['', 'x'.repeat(1001)]) {
      const res = await request.post(`${API}/assistant/messages`, { headers: authHeader(token), data: { message } });
      expect(res.status()).toBe(400);
    }
  });
});
