// Used by `ng serve --configuration e2e` (Playwright). The e2e backend runs on its own
// port so it never collides with another service listening on 3000. See e2e/stack.json.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3100',
};
