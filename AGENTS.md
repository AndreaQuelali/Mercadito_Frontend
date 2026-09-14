# Guía para Agentes de Inteligencia Artificial (AGENTS.md) - Mercadito Frontend

Este documento establece las pautas, convenciones y estándares técnicos obligatorios para cualquier agente de IA o desarrollador que modifique o extienda la base de código de **Mercadito_Frontend**.

---

## 1. Visión General del Proyecto

- **Framework**: Angular 16 (TypeScript 5, RxJS 7).
- **Estilos & UI**: Tailwind CSS 3 con sistema de diseño personalizado ("Mercado Boliviano").
- **Pruebas**: Karma + Jasmine (Unit Tests), Protractor / Cypress (E2E).
- **Propósito**: Aplicación web frontend para la plataforma de comercio electrónico Mercadito.

---

## 2. Arquitectura de Directorios

El código fuente se organiza bajo `src/app/` siguiendo principios de modularidad y responsabilidad única:

```
src/
├── app/
│   ├── core/           # Servicios singleton, guardias de ruta, interceptores HTTP, modelos centrales
│   ├── shared/         # Componentes reutilizables, directivas, pipes comunes
│   ├── pages/          # Vistas principales y páginas enrutables (Landing, Dashboard, Onboarding, etc.)
│   ├── services/       # Servicios de integración con APIs del backend
│   ├── app.module.ts   # Módulo principal de la aplicación
│   └── app-routing.module.ts
├── assets/             # Recursos estáticos (imágenes, fuentes, iconos)
└── styles.scss         # Estilos globales y tokens CSS del sistema de diseño
```

---

## 3. Reglas Estrictas de Código y Convenciones

### 3.1 Observancia del Sistema de Diseño (OBLIGATORIO)
- Todo agente de IA debe consultar [DESIGN.md](./DESIGN.md) y [`colores.md`](../colores.md) antes de crear o alterar componentes visuales.
- **Nombres de Variables Estandarizados**: Queda estrictamente prohibido usar nombres de colores directos (ej. `terracota`, `maiz`, `verde`). Se deben emplear exclusivamente tokens funcionales:
  - `primary` (#C65A3A)
  - `secondary` (#D9A441)
  - `success` (#5F7745)
  - `background` (#F7F0E3)
  - `text` (#3A2A22)
  - `accent` (#C83D68)
  - `info` (#3E9C9A)
- **Modo Oscuro**: Todos los componentes nuevos o modificados deben ser compatibles con el modo oscuro utilizando la clase `.dark` y los modificadores `dark:` de Tailwind CSS.

### 3.2 TypeScript y Angular
- **Tipado Estricto**: Evitar el uso de `any`. Definir interfaces o types descriptivos en `core/models/` o junto a la característica correspondiente.
- **Gestión de Suscripciones RxJS**: Prevenir fugas de memoria. Usar siempre el pipe `async` en plantillas HTML o el patrón `Subject`/`takeUntilDestroyed` en clases TypeScript.
- **HTML Semántico y Accesibilidad (a11y)**:
  - Usar etiquetas HTML5 (`<header>`, `<main>`, `<nav>`, `<article>`, `<footer>`).
  - Asegurar atributos `aria-label`, `alt` en imágenes y elementos interactivos accesibles por teclado.
  - Asignar `id`s únicos a elementos interactivos clave para automatización y pruebas.

---

## 4. Comandos de Desarrollo y Verificación

Antes de entregar cualquier tarea o Pull Request, el agente debe validar el proyecto ejecutando:

- **Servidor de Desarrollo**: `npm start` o `ng serve`
- **Compilación de Producción**: `npm run build`
- **Ejecución de Pruebas Unitarias**: `npm test`

---

## 5. Proceso de Contribución y Pull Requests

Toda modificación debe cumplir con el formato de PR definido en el proyecto. Asegurar que las pruebas pasen sin errores ni advertencias de compilación antes de solicitar revisión.
