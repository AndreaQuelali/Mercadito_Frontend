# Mercadito — Frontend

SPA Angular 16 para la plataforma de mercado local Mercadito. Conecta con el backend Express/Prisma en `Mercadito_Backend/`.

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 18.x o superior |
| npm         | 9.x o superior |

> Angular CLI **no necesita estar instalado globalmente**; el proyecto incluye `@angular/cli` como devDependency.

---

## 1. Instalar dependencias

```bash
cd Mercadito_Frontend
npm install
```

> Si estás detrás de un proxy corporativo o tienes problemas de certificado SSL, usa:
> ```bash
> npm install --strict-ssl false
> ```

---

## 2. Configurar variables de entorno

El archivo `src/environments/environment.ts` apunta por defecto a `http://localhost:3000` (puerto del backend).  
Si tu backend corre en un puerto diferente, edita esa URL:

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000', // ← ajusta si es necesario
};
```

---

## 3. Levantar el servidor de desarrollo

```bash
npx ng serve
# o con el binario local:
node node_modules/@angular/cli/bin/ng.js serve
```

La app estará disponible en **http://localhost:4200** con live reload.

---

## 4. Levantar el backend (requerido)

El frontend requiere que el backend esté corriendo. Desde `Mercadito_Backend/`:

```bash
# 1. Copiar y configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL y Redis

# 2. Levantar PostgreSQL y Redis con Docker
docker compose up -d

# 3. Aplicar migraciones de base de datos
npx prisma migrate deploy

# 4. Iniciar el servidor
npm run start:dev
```

El backend escucha en **http://localhost:3000**.

---

## 5. Comprar y vender con la misma cuenta

El registro crea usuarios con rol `user`. **Cualquier usuario autenticado puede comprar.**

Para vender, usa el CTA **“Quiero vender”** en el header (ruta `/seller/onboarding`). Eso llama a `POST /seller`, crea el perfil y el backend responde con un JWT que incluye `sellerId`.

Roles JWT: `user | admin`. La capacidad de vender no es un rol: es tener un perfil `Seller` (`sellerId` en el token).

Admins gestionan sellers en `/admin/sellers` (suspender / reactivar).

---

## Rutas disponibles

| Ruta | Acceso | Descripción |
|------|--------|-------------|
| `/` | Público | Landing marketing |
| `/home` | Autenticado | Descubrimiento (saludo, destacados, recién llegados) |
| `/products` | Público | Catálogo con búsqueda, filtros y orden |
| `/productos` | Redirect | Compat → `/products` |
| `/product/:id` | Público | Detalle de producto + reviews |
| `/auth/login` | Público | Iniciar sesión |
| `/auth/register` | Público | Crear cuenta |
| `/cart` | Autenticado | Carrito de compras |
| `/checkout` | Autenticado | Confirmar pedido |
| `/orders` | Autenticado | Mis pedidos |
| `/seller/onboarding` | Autenticado sin Seller | Crear perfil de vendedor |
| `/seller` | Con Seller | Panel del vendedor |
| `/seller/settings` | Con Seller | Configuración del puesto |
| `/seller/new` | Seller activo | Publicar nuevo producto |
| `/seller/edit/:id` | Seller activo | Editar producto existente |
| `/seller/orders` | Con Seller | Órdenes recibidas |
| `/admin/sellers` | Admin | Listar / suspender sellers |

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Servidor de desarrollo en `:4200` |
| `npm run build` | Build de producción en `dist/` |
| `npm run watch` | Build continuo en modo development |
| `npm test` | Ejecutar tests unitarios (Karma, modo watch) |
| `npm run test:ci` | Tests unitarios una sola vez, con Chrome headless |
| `npm run e2e` | Tests end-to-end (Playwright) contra un backend real desechable. Ver [Pruebas e2e](#pruebas-e2e) |
| `npm run e2e:ui` | Lo mismo con la interfaz de Playwright, para depurar |

### Pruebas e2e

Los tests de `e2e/tests` (Playwright) recorren tres flujos contra el **backend real**:

- `auth.spec.ts`: registro, login, sesión que sobrevive a un reload, correo repetido, contraseña incorrecta y redirección de páginas protegidas.
- `buy.spec.ts`: buscar un producto, agregarlo al carrito, pagar, ver el pedido, bajada de stock, aviso `order:new` al vendedor y renovación automática de un access token vencido.
- `seller.spec.ts`: crear el puesto, publicar un producto, ajustar stock en Inventario y apagar una notificación en Configuración.

`npm run e2e` hace todo solo (`e2e/run.mjs`):

1. Levanta Postgres y Redis desechables desde `../Mercadito_Backend/docker-compose.e2e.yaml` (puertos propios **5434** y **6380**, sin volúmenes: no toca tu base de datos de desarrollo ni otros servicios en 3000/5432/6379).
2. Aplica las migraciones de Prisma a esa base vacía.
3. Playwright arranca el backend en **:3100** y la app en **:4201** (configuración `e2e` de Angular, que apunta a esa API), corre los tests y apaga todo.

Los tests crean sus propios datos por la API (correos y productos únicos), así que no necesitan un seed.

Requisitos: Docker en marcha, Google Chrome instalado y las dependencias del backend instaladas. Sin Chrome: `E2E_BROWSER=chromium npx playwright install chromium` y luego `E2E_BROWSER=chromium npm run e2e`. Para depurar, `E2E_KEEP_INFRA=1` deja los contenedores arriba; si el backend vive en otra carpeta, `MERCADITO_BACKEND_DIR=<ruta>`. El reporte HTML queda en `playwright-report/`.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── components/       # Componentes reutilizables (header, product-card, toast…)
│   ├── guards/           # authGuard, sellerGuard, noSellerGuard, adminGuard
│   ├── interceptors/     # AuthInterceptor (adjunta JWT a peticiones)
│   ├── pages/            # auth, home, cart, seller, admin…
│   └── services/         # AuthService, SellerService, CartService, OrderService…
└── environments/
    ├── environment.ts        # Desarrollo (apiUrl: localhost:3000)
    └── environment.prod.ts   # Producción
```

---

## Licencia

MIT License — Copyright (c) 2025 Mercadito
