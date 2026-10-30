# Sistema de Diseño Visual (DESIGN.md) - Mercadito Frontend

Este documento define el **Sistema de Diseño Visual de Mercadito**, basado en la paleta cultural **"Mercado Boliviano"**. Define los tokens de color estandarizados, la tipografía, componentes UI base, soporte para modo oscuro y guías de interacción.

---

## 1. Paleta de Colores y Tokens Estandarizados

Conforme a lo estipulado en [`colores.md`](../colores.md), **los nombres de los colores no deben referenciar directamente 'terracota', 'maíz' o 'verde'**, sino emplear nombres semánticos estandarizados (`primary`, `secondary`, etc.).

### 1.1 Tabla de Tokens Semánticos (Modo Claro vs Modo Oscuro)

| Token Semántico | Referencia Cultural | Color HEX (Claro) | Color HEX (Oscuro) | Uso Principal |
| :--- | :--- | :--- | :--- | :--- |
| `primary` | Terracota | `#B3412C` | `#E0704F` | Botones principales, CTAs, elementos destacados |
| `secondary` | Maíz | `#D9A441` | `#F2C94C` | Destacados secundarios, badges especiales |
| `success` | Verde Hoja | `#5F7745` | `#81B29A` | Estados de éxito, productos frescos, confirmaciones |
| `background` | Crema claro | `#FDFBF8` | `#121212` | Fondo principal de la aplicación y páginas |
| `surface` | Blanco Mármol / Grafito | `#FFFFFF` | `#1E1E1E` | Tarjetas, contenedores elevadas, paneles |
| `text` | Café único | `#1C1613` | `#FDFBF8` | Texto principal, encabezados, cuerpo de texto |
| `text-muted` | Café Claro / Gris | `#6E5D53` | `#A09A95` | Textos secundarios, descripciones, fechas |
| `accent` | Fucsia Aguayo | `#C83D68` | `#E65C84` | Acentos, promociones, ofertas de alto impacto |
| `info` | Turquesa | `#3E9C9A` | `#56C2C0` | Mensajes informativos, elementos secundarios |
| `border` | Arcilla Suave / Oscuro | `#E5D9C8` | `#2D2D2D` | Bordes de contenedores, divisores |

---

## 2. Configuración e Integración con Tailwind CSS

Los tokens de diseño están integrados en `tailwind.config.js` y `styles.scss` mediante variables CSS nativas:

```javascript
// tailwind.config.js (Extracto de configuración)
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
        },
        success: {
          DEFAULT: 'var(--color-success)',
        },
        background: {
          DEFAULT: 'var(--color-background)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
        }
      }
    }
  }
}
```

---

## 3. Modo Oscuro (Dark Mode)

La aplicación implementa soporte nativo para el modo oscuro alternando la clase `.dark` en la etiqueta `<html>` o `<body>`.

### Reglas de Aplicación:
1. **Nunca hardcodear valores de color HEX directamente en componentes HTML/CSS.**
2. Usar siempre las clases utilitarias de Tailwind o variables CSS (ej. `bg-background text-text dark:bg-background dark:text-text`).
3. Mantener contraste legible (cumplimiento mínimo **WCAG 2.1 AA** con ratio >= 4.5:1).

---

## 4. Tipografía y Jerarquía Visual

- **Fuente Primaria**: 'Libre Franklin' (texto) y 'Besley' (títulos, `font-display`), con system-ui y Georgia como respaldo.
- **Rediseño (rama feat/ui-redesign)**: esquinas rectas, sin sombras en reposo ni degradados, y la franja de aguayo como detalle de marca.
- **Escala Tipográfica**:
  - `H1` / Título Principal: `text-3xl lg:text-4xl font-bold tracking-tight text-text`
  - `H2` / Sección: `text-2xl font-semibold text-text`
  - `H3` / Subsección: `text-xl font-medium text-text`
  - Body / Texto base: `text-base font-normal text-text`
  - Caption / Secundario: `text-sm font-normal text-text-muted`

---

## 5. Componentes UI Estandarizados

### 5.1 Botones (`Buttons`)
- **Primary**: `bg-primary hover:bg-primary-hover text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm`
- **Secondary**: `bg-secondary text-text font-medium px-4 py-2 rounded-lg transition-colors shadow-sm`
- **Outline**: `border border-border text-text hover:bg-surface px-4 py-2 rounded-lg transition-colors`

### 5.2 Tarjetas (`Cards`)
- `bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`

### 5.3 Campos de Entrada (`Inputs`)
- `bg-surface border border-border text-text placeholder:text-text-muted rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none transition-all`

---

## 6. Micro-interacciones y Animaciones

- **Transiciones**: Usar `transition-all duration-200 ease-in-out` para responder suavemente al pasar el cursor (hover), enfocar (focus) o presionar (active).
- **Glassmorphism**: Para elementos emergentes y barras de navegación superiores fijas (`backdrop-blur-md bg-surface/80 border-b border-border`).


## 7. Reglas de color del rediseño

- **Un solo café**: `#1C1613` es la letra en modo claro, el fondo en modo oscuro y las superficies invertidas (pie, paneles de foto, barra lateral del vendedor). El crema único es `#FDFBF8` (fondo claro y letra oscura).
- **Botones y aguayo no cambian entre modos**: `primary`, `secondary`, `accent-green`, `accent-pink` y `accent-teal` tienen el mismo valor en claro y oscuro. Solo los enlaces sobre el fondo usan `--color-link`, que se aclara en modo oscuro para mantener el contraste.
- **Excepción**: la franja de aguayo usa su propio café (`--color-aguayo-brown`, `#4A3328`).

## 8. Estado vacío (`<ui-empty>`)

Componente único para todo estado vacío (`src/app/components/ui/ui-empty.component.ts`). Sin fondo ni tarjeta, centrado en el espacio libre.

**Anatomía:** icono grande de trazo sin fondo (72 px) con el color de la variante, título corto que dice qué pasa, una frase con el siguiente paso y las acciones (contenido proyectado).

| Variante | Cuándo | Color del icono | Acción típica |
| :--- | :--- | :--- | :--- |
| `first` (por defecto) | Todavía no hay nada | `secondary` | Botón principal que invita a empezar |
| `no-results` | La búsqueda o el filtro no encuentra nada | `accent-teal` | "Limpiar filtros" |
| `error` | No se pudo cargar | `accent-pink` | "Reintentar" |

**Reglas:** el título dice la situación sin disculparse; el texto da el paso siguiente; el botón nombra la acción ("Explorar productos", no "Aceptar"); un solo botón principal.

```html
<ui-empty icon="orders" title="Aún no has hecho pedidos" text="Cuando hagas una compra, aparecerá aquí.">
  <a routerLink="/products" class="ui-btn">Explorar productos</a>
</ui-empty>
```
