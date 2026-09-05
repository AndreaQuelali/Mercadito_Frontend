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
| `/` | Público | Catálogo de productos |
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
| `npm test` | Ejecutar tests unitarios (Karma) |

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
