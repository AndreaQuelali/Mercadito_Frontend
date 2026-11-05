import { test, expect, APIRequestContext } from '@playwright/test';
import { API, authHeader, loginViaApi, registerViaApi, seedProduct, unique } from '../support/api';

// The backend runs with EMBEDDINGS_PROVIDER=fake and SEARCH_RATE_LIMIT_PER_MIN=8 (playwright.config.ts)
const RATE_LIMIT = 8;

interface SearchItem {
  id: number;
  name: string;
  stock: number;
  score: number;
}

async function searchAs(
  request: APIRequestContext,
  token: string,
  params: Record<string, string | number | boolean>
) {
  return request.get(`${API}/product/search`, { headers: authHeader(token), params });
}

/** A buyer with a session; each test gets its own so the per-user rate limit never interferes */
async function newBuyerToken(request: APIRequestContext): Promise<string> {
  const buyer = await registerViaApi(request);
  return (await loginViaApi(request, buyer)).token;
}

test.describe('Semantic product search (API)', () => {
  test('a created product shows up once the queue has indexed it', async ({ request }) => {
    // Unique word: only this product can match it
    const word = unique('zanahoria').replace(/-/g, '');
    const product = await seedProduct(request, { name: `${word} morada`, description: `${word} fresca de huerta` });
    const token = await newBuyerToken(request);

    // The vector part is eventually consistent: wait for the worker, then expect a hybrid answer
    await expect
      .poll(
        async () => {
          const res = await searchAs(request, token, { q: word });
          expect(res.status()).toBe(200);
          const { data } = await res.json();
          return data.mode === 'hybrid' && (data.items as SearchItem[]).some((i) => i.id === product.id);
        },
        { timeout: 20_000, intervals: [500, 1000] }
      )
      .toBe(true);

    const res = await searchAs(request, token, { q: word });
    const items = (await res.json()).data.items as SearchItem[];
    expect(items[0].id).toBe(product.id);
    expect(items[0].score).toBeGreaterThan(0);
  });

  test('a product without stock is hidden unless includeOutOfStock=true', async ({ request }) => {
    const word = unique('membrillo').replace(/-/g, '');
    const product = await seedProduct(request, { name: `${word} dulce`, stock: 0 });
    const token = await newBuyerToken(request);

    const hidden = await searchAs(request, token, { q: word });
    expect(hidden.status()).toBe(200);
    expect(((await hidden.json()).data.items as SearchItem[]).map((i) => i.id)).not.toContain(product.id);

    const shown = await searchAs(request, token, { q: word, includeOutOfStock: true });
    expect(((await shown.json()).data.items as SearchItem[]).map((i) => i.id)).toContain(product.id);
  });

  test('the category filter narrows the results', async ({ request }) => {
    const word = unique('especial').replace(/-/g, '');
    const fruta = await seedProduct(request, { name: `${word} fruta`, category: 'frutas' });
    const verdura = await seedProduct(request, { name: `${word} verdura`, category: 'verduras' });
    const token = await newBuyerToken(request);

    const all = await searchAs(request, token, { q: word });
    const allIds = ((await all.json()).data.items as SearchItem[]).map((i) => i.id);
    expect(allIds).toEqual(expect.arrayContaining([fruta.id, verdura.id]));

    const onlyFrutas = await searchAs(request, token, { q: word, category: 'frutas' });
    const ids = ((await onlyFrutas.json()).data.items as SearchItem[]).map((i) => i.id);
    expect(ids).toContain(fruta.id);
    expect(ids).not.toContain(verdura.id);
  });

  test('without a session it answers 401, and an empty or oversized q answers 400', async ({ request }) => {
    const anonymous = await request.get(`${API}/product/search`, { params: { q: 'pan' } });
    expect(anonymous.status()).toBe(401);

    const token = await newBuyerToken(request);
    expect((await searchAs(request, token, { q: '' })).status()).toBe(400);
    expect((await searchAs(request, token, { q: 'x'.repeat(201) })).status()).toBe(400);
    expect((await searchAs(request, token, { q: 'pan', limit: 26 })).status()).toBe(400);
  });

  test('it answers 429 with Retry-After past the per-minute limit', async ({ request }) => {
    const token = await newBuyerToken(request);

    for (let i = 0; i < RATE_LIMIT; i++) {
      expect((await searchAs(request, token, { q: 'pan' })).status(), `search ${i + 1}`).toBe(200);
    }
    const blocked = await searchAs(request, token, { q: 'pan' });
    expect(blocked.status()).toBe(429);
    expect(Number(blocked.headers()['retry-after'])).toBeGreaterThan(0);

    // Another user is not affected
    const other = await newBuyerToken(request);
    expect((await searchAs(request, other, { q: 'pan' })).status()).toBe(200);
  });
});
