# SPEC 02 — Tema MongoDB claro/oscuro, layout y árbol de rutas del MVP

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-08
> **Objective:** Construir la base visual y de navegación del MVP de Mini-Croper (tema claro/oscuro con la identidad de mongodb.com/es, layout responsive con header + panel derecho + contenido, componentes UI base y el árbol completo de rutas lazy con pantallas placeholder) sin ninguna lógica de negocio.

---

## Por qué existe esta spec

El MVP completo es demasiado grande para una sola spec (tema, layout, ~15 componentes UI y ~28 pantallas). Se divide en dos:

- **SPEC 02 (esta):** base compartida. Tema, tipografía, layout, componentes UI base, rutas y navegación.
- **SPEC 03 (pendiente, se redacta con `/spec`):** maquetar cada pantalla con datos mock, por dominio, creando con la skill `ui-component` los componentes que falten (input, select, dialog, tabs, etc.).

El backend (`agro-app-workspace`, NestJS, API en `:3000`) define qué pantallas existen: las rutas de esta spec salen de sus controladores y de `docs/reglas-de-negocio.md`. Esta spec **no se conecta al backend**; solo documenta en cada placeholder qué endpoints consumirá la pantalla.

## Alcance

**Dentro:**

- Tema claro y oscuro con la paleta y la tipografía de mongodb.com/es, expresado como tokens CSS y variables de Tailwind v4 (`@theme`) en `src/styles.css`, más el ajuste del tema de Material en `src/material-theme.scss` para que ambos modos usen esos colores.
- Bordes redondeados en todo: escala de radios como tokens y mapeo a `--mat-sys-corner-*`.
- Tipografía auto-hospedada con fuentes libres equivalentes (sin Google Fonts en runtime).
- `ThemeService` (claro / oscuro / sistema) con persistencia en `localStorage` y selector en el header.
- Layout de la app (`src/app/core/layout/`): header superior, panel de navegación a la derecha y zona central con `<router-outlet>`. En pantallas menores a `lg` el panel pasa a drawer que entra por la derecha.
- Selector de **rol de demo** en el header (`PRODUCTOR`, `PROVEEDOR`, `ADMIN`, o "Visitante") que solo filtra los ítems del panel. No hay login funcional, ni guards, ni tokens.
- Componentes UI nuevos creados con la skill `ui-component` en `src/app/shared/ui/`: `app-icon`, `app-button`, `app-card`, `app-badge`, `app-menu`, `app-drawer`, `app-page-header` y `app-empty-state`, cada uno con su demo bajo `/ui/<nombre>`.
- Árbol completo de rutas lazy (ver "Mapa de rutas") con un componente placeholder reutilizable que muestra título, rol, descripción y endpoints del backend que usará la pantalla.
- Página 404.
- Todo responsive: 360 px, 768 px y 1280 px sin scroll horizontal de página.
- Actualizar `CLAUDE.md` con la estructura `core/` y `features/` y la convención de tokens.

**Fuera de alcance (SPEC 03 u otras):**

- Maquetar el contenido real de las pantallas (tablas con datos, formularios, tarjetas de producto, carrito, checkout, etc.) y sus datos mock.
- Componentes de formulario (`app-input`, `app-select`, `app-checkbox`, `app-textarea`), `app-dialog`, `app-tabs`, `app-snackbar`: los crea SPEC 03 con la skill cuando una pantalla los pida.
- Lógica: llamadas HTTP, servicios de dominio, estado de sesión real, login, refresh de tokens, guards, interceptores, `Idempotency-Key`, validaciones.
- Internacionalización (la app queda solo en español).
- Imágenes de producto, logo definitivo y favicon propio.
- Tests e2e.

## Modelo de datos

La spec no introduce datos de negocio. Solo tipos de UI y de navegación, sin ninguna referencia a Material ni a CDK.

```ts
// src/app/core/theme/theme.types.ts
export type ThemeMode = 'light' | 'dark' | 'system'; // clave localStorage: 'agro:theme'

// src/app/core/navigation/navigation.types.ts
export type DemoRole = 'VISITANTE' | 'PRODUCTOR' | 'PROVEEDOR' | 'ADMIN'; // clave localStorage: 'agro:demo-role'
export type AppRole = Exclude<DemoRole, 'VISITANTE'>;

export interface NavItem {
  label: string;
  path: string; // ruta absoluta, p. ej. '/admin/usuarios'
  icon: string; // nombre de icono de app-icon
  roles: DemoRole[]; // roles que ven el ítem en el panel
  group: 'Explorar' | 'Compras' | 'Mi tienda' | 'Administración' | 'Cuenta';
}

// Datos que lleva cada ruta (Route.data), leídos por el placeholder y por el panel
export interface RouteInfo {
  roles: DemoRole[];
  description: string;
  endpoints: string[]; // p. ej. ['GET /orders', 'GET /orders/:id']
}
```

Convenciones:

- Tokens de color con prefijo `--color-*` en Tailwind (`bg-surface`, `text-fg`, `border-line`, `bg-brand`…). El modo oscuro los redefine bajo `.app-dark`, la clase que ya usa `src/material-theme.scss` y la variante `dark` de Tailwind.
- Escala de radios: `--radius-sm: 8px`, `--radius-md: 12px`, `--radius-lg: 16px`, `--radius-xl: 24px`, `--radius-pill: 9999px`. Botones y badges en `pill`, tarjetas y panel en `lg`/`xl`, controles en `md`.
- Paleta inicial (a confirmar en el paso 1 contra mongodb.com/es antes de fijarla): verde primario `#00ED64`, verde bosque `#00684A`, fondo oscuro `#001E2B`, superficie oscura `#023430`, neutro menta claro `#E3FCF7`, texto claro `#001E2B`. Los pares texto/fondo deben cumplir contraste AA 4.5:1 (3:1 en texto grande); si un color de marca no lo cumple como texto, se usa solo como relleno y el texto sobre él es `#001E2B`.
- Tipografía: títulos con **Source Serif 4** (equivalente libre de MongoDB Value Serif), cuerpo con **Figtree** (equivalente libre de Euclid Circular A) y código con **Source Code Pro**. Se instalan como paquetes `@fontsource*` y se sirven desde el propio bundle.
- Breakpoints: los de Tailwind. Panel fijo desde `lg` (1024 px); drawer por debajo.
- Valor por defecto del tema: `system`. Valor por defecto del rol de demo: `VISITANTE`.

## Mapa de rutas

Todas lazy (`loadChildren` por dominio, `loadComponent` por pantalla). Todas usan el placeholder en esta spec; SPEC 03 reemplaza cada `loadComponent`. Los nombres de ruta están en español. El shell envuelve a todas, incluidas login y registro. `/ui/table` y las demos `/ui/*` se conservan.

| Ruta | Rol de demo | Endpoints que consumirá |
| --- | --- | --- |
| `/` | todos | redirige a `/catalogo` |
| `/catalogo` | todos | `GET /catalog/products`, `GET /catalog/categories` |
| `/catalogo/productos/:id` | todos | `GET /catalog/products/:id` |
| `/catalogo/ofertas` | todos | `GET /catalog/offers` |
| `/catalogo/tiendas` | todos | `GET /catalog/stores` |
| `/catalogo/tiendas/:id` | todos | `GET /catalog/stores/:id` |
| `/auth/login` | VISITANTE | `POST /auth/login` |
| `/auth/registro` | VISITANTE | `POST /auth/register` |
| `/cuenta` | PRODUCTOR, PROVEEDOR, ADMIN | `GET /auth/me`, `POST /auth/change-password`, `POST /auth/logout` |
| `/carrito` | PRODUCTOR | `GET/DELETE /orders/cart`, `PUT/DELETE /orders/cart/items/:variantId` |
| `/checkout` | PRODUCTOR | `POST /orders/checkout` |
| `/pedidos` | PRODUCTOR | `GET /orders` |
| `/pedidos/:id` | PRODUCTOR | `GET /orders/:id` |
| `/pedidos/:id/pago` | PRODUCTOR | `POST /payments` |
| `/pagos` | PRODUCTOR | `GET /payments` |
| `/pagos/:id` | PRODUCTOR | `GET /payments/:id` |
| `/proveedor/tienda` | PROVEEDOR | `GET /catalog/my-store`, `POST /catalog/stores` |
| `/proveedor/productos` | PROVEEDOR | `GET /catalog/my-store`, `GET /catalog/products` |
| `/proveedor/productos/nuevo` | PROVEEDOR | `POST /catalog/products` |
| `/proveedor/productos/:id` | PROVEEDOR | `PATCH /catalog/products/:id`, `POST /catalog/products/:id/variants`, `PATCH /catalog/variants/:id`, `PATCH /catalog/variants/:id/stock` |
| `/proveedor/pedidos` | PROVEEDOR | `GET /orders/provider/sub-orders` |
| `/proveedor/pedidos/:id` | PROVEEDOR | `GET /orders/provider/sub-orders/:id` |
| `/admin/usuarios` | ADMIN | `GET /auth/users` |
| `/admin/usuarios/:id` | ADMIN | `GET /auth/users/:id`, `POST /auth/users/:id/approve\|reject\|disable\|enable`, `PATCH /auth/users/:id/role` |
| `/admin/categorias` | ADMIN | `GET /catalog/categories`, `POST /catalog/categories`, `PATCH /catalog/categories/:id` |
| `/admin/tiendas` | ADMIN | `GET /catalog/admin/stores` |
| `/admin/tiendas/:id` | ADMIN | `GET/PATCH /catalog/admin/stores/:id`, `POST /catalog/admin/stores/:id/deactivate` |
| `/admin/pedidos` | ADMIN | `GET /orders/admin` |
| `/admin/pedidos/:id` | ADMIN | `GET /orders/admin/:id` |
| `/admin/pagos` | ADMIN | `GET /payments/admin` |
| `/admin/pagos/:id` | ADMIN | `GET /payments/admin/:id` |
| `**` | todos | página 404 |

No tienen pantalla: `POST /auth/refresh` y `POST /payments/webhook` (técnicos), `/internal/*` y el health check.

Panel por rol de demo (grupos de `NavItem`):

- **VISITANTE:** Explorar (catálogo, ofertas, tiendas), Cuenta (iniciar sesión, registrarse).
- **PRODUCTOR:** Explorar, Compras (carrito, pedidos, pagos), Cuenta.
- **PROVEEDOR:** Explorar, Mi tienda (tienda, productos, pedidos recibidos), Cuenta.
- **ADMIN:** Explorar, Administración (usuarios, categorías, tiendas, pedidos, pagos), Cuenta.

## Plan de implementación

Cada paso deja la app compilando y navegable. Antes de crear cualquier componente `app-*` se invoca la skill `ui-component`; el diseño visual sigue las skills `frontend-design` y `web-design-guidelines`.

1. **Tokens y fuentes.** Comprobar la paleta contra mongodb.com/es y fijarla. Instalar `@fontsource-variable/source-serif-4`, `@fontsource-variable/figtree` y `@fontsource/source-code-pro`. Definir en `src/styles.css` los tokens de color (claro y `.app-dark`), radios y familias con `@theme`, y ajustar `src/material-theme.scss` (paleta, `--mat-sys-corner-*`, tipografía). Verificar en `/ui/table` en ambos modos.
2. **`ThemeService`.** Crear `src/app/core/theme/` con el servicio (`@Service`, signal `mode`, `computed` del modo efectivo, `localStorage` con `try/catch`, `prefers-color-scheme` para `system`, alterna la clase `.app-dark` en `<html>`) y sus tipos. Test Vitest.
3. **Componentes sin librería:** `app-icon` (SVG inline con un set mínimo de iconos), `app-button` (variantes `primary`, `secondary`, `ghost`; tamaños `sm`, `md`, `lg`; modo solo-icono con `ariaLabel` obligatorio; forma pill), `app-badge`, `app-card`, `app-page-header` y `app-empty-state`. Cada uno con `.types.ts`, spec Vitest y demo lazy `/ui/<nombre>`.
4. **Componentes sobre Material:** `app-menu` (opciones con tipos propios) y `app-drawer` (lado `end`, abierto como `model()`, cierra con Esc y devuelve el foco). Con demo y spec.
5. **Navegación.** Crear `src/app/core/navigation/` con `DemoRoleService` (signal `role`, persistencia `agro:demo-role`), `nav.config.ts` con los `NavItem` y un `computed` de ítems visibles por rol y agrupados.
6. **Layout.** Crear `src/app/core/layout/` con `AppShell`, `AppHeader` y `AppSidePanel`. Header: marca, botón de panel (visible bajo `lg`), selector de rol de demo (`app-menu`), selector de tema y menú de usuario simulado. Panel: ítems agrupados, ítem activo con `aria-current="page"`, mismo contenido en el panel fijo (`lg+`) y en el drawer (`<lg`), que se cierra al navegar. Reemplazar `src/app/app.html` por el shell.
7. **Rutas y placeholders.** Crear `RoutePlaceholder` (lee `RouteInfo` de `route.data`) y los archivos `src/app/features/{catalogo,auth,cuenta,pedidos,pagos,proveedor,admin}/<dominio>.routes.ts` con todas las rutas del mapa, la redirección `/` y la 404. Registrarlos con `loadChildren` en `src/app/app.routes.ts` y poner `title` en cada ruta.
8. **Cierre.** Test que recorre la configuración de rutas y comprueba que cada una tiene `title`, `data.roles` y `data.endpoints`, y que cada `NavItem.path` existe. Actualizar `CLAUDE.md` con la estructura `core/` y `features/`, los tokens y la convención de rutas en español.

## Criterios de aceptación

- [ ] Existe la paleta clara y oscura como tokens en `src/styles.css`, y `app-dark` en `<html>` cambia toda la UI, incluidos los componentes de Material.
- [ ] Los colores base (fondo, superficie, verde de marca, texto) coinciden con los verificados en mongodb.com/es y quedan documentados en `styles.css`.
- [ ] Títulos con Source Serif 4, cuerpo con Figtree y código con Source Code Pro, servidos sin peticiones a Google Fonts.
- [ ] El selector de tema alterna claro, oscuro y sistema, y la elección persiste al recargar (`agro:theme`).
- [ ] Con `system`, el tema sigue `prefers-color-scheme`.
- [ ] Botones y badges son pill; tarjetas, panel, drawer y controles usan los radios del token; no hay esquinas rectas visibles en el layout.
- [ ] A 1280 px el panel de navegación está fijo a la derecha, el header arriba y el contenido al centro.
- [ ] A 768 px y 360 px el panel no se ve, el header muestra el botón que abre el drawer desde la derecha, y el drawer se cierra con Esc, con clic fuera y al navegar.
- [ ] A 360, 768 y 1280 px no hay scroll horizontal de página en ninguna ruta del mapa.
- [ ] Cambiar el rol de demo cambia los ítems del panel según el mapa, y la elección persiste (`agro:demo-role`).
- [ ] Cada ruta del mapa carga de forma lazy, muestra su placeholder con título, rol, descripción y endpoints, y fija `document.title`.
- [ ] `/` redirige a `/catalogo` y una URL inexistente muestra la 404.
- [ ] Todas las rutas de rol son accesibles por URL con cualquier rol de demo (no hay guards en esta spec).
- [ ] `/ui/table` y las demos `/ui/button`, `/ui/icon`, `/ui/card`, `/ui/badge`, `/ui/menu`, `/ui/drawer`, `/ui/page-header` y `/ui/empty-state` funcionan en ambos temas.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] Ningún componente `app-*` expone tipos ni eventos de Material o CDK en su API.
- [ ] El shell y las demos no tienen violaciones AXE en claro ni en oscuro, el foco es visible y todo el panel se maneja con teclado.
- [ ] Los botones solo-icono y el selector de tema tienen `aria-label`.
- [ ] `ng test` pasa y `npm run build` termina sin errores.

## Decisiones tomadas y descartadas

- **Sí:** dividir el MVP en SPEC 02 (base) y SPEC 03 (pantallas mock). Cada una es verificable por separado y la base evita rehacer el layout al maquetar.
- **No:** una sola spec con todo. Con ~15 pasos sería difícil de revisar.
- **Sí:** el panel va a la derecha, como se pidió, y en móvil se convierte en drawer por la derecha. Mantiene el mismo lado en todos los tamaños.
- **Sí:** selector de rol de demo en el header que solo filtra el panel. Permite ver las tres experiencias sin lógica de auth.
- **No:** guards ni sesión simulada. Son lógica y se hacen en una spec posterior junto con la integración.
- **Sí:** rutas en español, agrupadas por dominio con `loadChildren`. Coincide con el idioma del producto y cumple la regla de lazy loading.
- **Sí:** un único `RoutePlaceholder` con `data` de ruta (incluye los endpoints). Evita ~28 archivos desechables y deja documentada la integración.
- **Sí:** el shell envuelve también login y registro. Mantiene el layout único que se pidió.
- **Sí:** fuentes libres equivalentes (Source Serif 4, Figtree, Source Code Pro). MongoDB Value Serif y Euclid Circular A son propietarias y no se pueden redistribuir.
- **No:** Google Fonts en runtime. Es una dependencia externa y un coste de privacidad y de carga.
- **Sí:** paleta tomada de mongodb.com/es y verificada en el paso 1, sin inventar valores. Donde un color de marca no cumpla AA como texto, se usa solo como relleno.
- **Sí:** tokens en `@theme` de Tailwind y reutilizados en el tema de Material. Un único origen de color para ambos.
- **Sí:** modo oscuro por clase `.app-dark`. Es lo que ya usan `styles.css` y `material-theme.scss`.
- **Sí:** `app-icon`, `app-button`, `app-card`, `app-badge`, `app-page-header` y `app-empty-state` son propios y no usan Material; `app-menu` y `app-drawer` sí. Material solo entra donde aporta accesibilidad y comportamiento ya resueltos (foco, overlay, teclado).
- **Sí:** crear solo los componentes que el layout necesita. El resto lo pide SPEC 03 invocando la skill, que es el flujo definido en SPEC 01.
- **No:** crear ahora todos los componentes de formulario. Se diseñarían sin ver la pantalla que los usa.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Algún color de MongoDB no pasa contraste AA como texto (el verde `#00ED64` sobre blanco) | El verde se usa como relleno con texto `#001E2B`. El contraste se comprueba con AXE en ambos modos. |
| Las fuentes libres no se parecen lo bastante a las de MongoDB | Se valida visualmente en el paso 1. Cambiar de familia solo toca `@theme` y los paquetes `@fontsource`. |
| Material y Tailwind chocan en estilos globales (reset, radios) | Los tokens se definen una vez y Material los consume; se revisa en las demos de cada componente. |
| El drawer pierde el foco o no lo atrapa | Se usa `MatSidenav` dentro de `app-drawer`, que gestiona el foco, y se prueba con teclado. |
| El panel derecho tapa contenido en pantallas medianas | `lg` es el punto de corte; entre 768 y 1023 px se usa el drawer. Se verifica en 768 px. |
| Los endpoints del mapa cambian en el backend | El mapa se generó de los controladores a 2026-11-08. La fuente de verdad es el backend; SPEC 03 los revalida antes de maquetar. |
| `RoutePlaceholder` se queda en producción por olvido | SPEC 03 lista una pantalla por ruta; un test de SPEC 02 muestra qué rutas aún usan el placeholder. |

## Lo que **no** está en esta spec

- El contenido real de las pantallas ni datos mock (SPEC 03).
- Componentes de formulario, diálogos, pestañas y snackbar (SPEC 03, vía skill `ui-component`).
- Llamadas HTTP, login real, guards, tokens y cualquier lógica de negocio.
- Internacionalización, imágenes de producto, logo y favicon definitivos.
- Tests e2e.
