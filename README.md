# Mini-Croper · Frontend

Frontend del marketplace agropecuario **Mini-Croper**, construido con Angular 22 (standalone, signals y Signal Forms), Tailwind CSS v4 y Angular Material encapsulado en componentes propios.

Su backend es `agro-app-workspace` (NestJS, API en `:3000`); las reglas de negocio están en `docs/reglas-de-negocio.md` de ese repositorio.

## Funcionalidades

| Módulo                | Rutas                | Descripción                                                                      |
| --------------------- | -------------------- | -------------------------------------------------------------------------------- |
| Auth y cuenta         | `/auth/*`, `/cuenta` | Login, registro (el proveedor queda en solicitud pendiente), sesión y cuenta     |
| Catálogo público      | `/catalogo/*`        | Productos, detalle, ofertas, tiendas y detalle de tienda                         |
| Compra del productor  | `/carrito`, `/pedidos` | Carrito, checkout, pedidos con sondeo y cronómetro de pago                     |
| Pagos                 | `/pedidos/:id/pago`, `/pagos` | Simulador de pasarela, historial y detalle de pagos                     |
| Proveedor             | `/proveedor/*`       | Tienda, productos, presentaciones, stock y pedidos recibidos                     |
| Administración        | `/admin/*`           | Usuarios, categorías, tiendas, pedidos y pagos                                   |

Cuatro roles: `VISITANTE`, `PRODUCTOR`, `PROVEEDOR` y `ADMIN`. Un `accessGuard` único protege las rutas según `RouteInfo.roles` (es una ayuda de UX; el backend es la autoridad).

## Requisitos

- Node.js y npm 11 (`packageManager: npm@11.19.0`)
- Backend `agro-app-workspace` corriendo en `http://localhost:3000`

## Puesta en marcha

```bash
npm install
npm start
```

Abre `http://localhost:4200`. El servidor de desarrollo reenvía `/api` → `http://localhost:3000` quitando el prefijo (`proxy.conf.json`); si lo cambias, reinicia el servidor. Con el backend apagado el proxy responde `502` y la app lo trata como "sin conexión".

## Scripts

| Comando         | Descripción                                          |
| --------------- | ---------------------------------------------------- |
| `npm start`     | Servidor de desarrollo (`ng serve`)                  |
| `npm run build` | Build de producción en `dist/`                       |
| `npm run watch` | Build de desarrollo en modo watch                    |
| `npm test`      | Pruebas unitarias con Vitest (jsdom)                 |

Un solo archivo de pruebas: `ng test --include src/app/app.spec.ts`.

## Estructura

```text
src/app/
├── core/          # infraestructura: http, auth, cart, orders, payments, catalog,
│                  # theme, navigation, routing y layout
├── features/      # catalogo, auth, cuenta, pedidos, pagos, proveedor, admin
└── shared/ui/     # componentes app-* (únicos que conocen Material/CDK)
```

Convenciones principales:

- Cada módulo tiene `index.ts` como API pública; desde fuera solo se importa por ahí.
- Una feature usa `core` y `shared/ui`, pero nunca otra feature; `core` nunca importa de `features`.
- Todas las rutas son lazy, están en español y llevan `title` y `data: RouteInfo`.
- **Prohibido** importar `@angular/material/*` o `@angular/cdk/*` fuera de `shared/ui`. Las features usan solo `app-*`.
- Los formularios usan Signal Forms (`form(model, schema, { submission })`).

El detalle completo está en [`CLAUDE.md`](./CLAUDE.md) y las especificaciones por módulo en [`specs/`](./specs).

## Sesión y seguridad

- El access token vive solo en memoria; el refresh token, en `localStorage` (`agro:refresh-token`).
- Al arrancar se restaura la sesión con `POST /auth/refresh`.
- `authInterceptor` añade `Authorization: Bearer` solo a `/api/*` y, ante un `401`, hace un único refresh compartido entre pestañas y reintenta una vez.

## Estilos y tema

- Tipografía auto-hospedada: Source Serif 4 (títulos), Figtree (cuerpo) y Source Code Pro (código).
- Colores como variables CSS `--c-*` (claro y oscuro con la clase `.app-dark`), expuestas a Tailwind. Usa los tokens (`bg-surface`, `text-fg`, `bg-brand`…), no colores fijos.
- Tema claro, oscuro o del sistema, guardado en `localStorage` (`agro:theme`).

## Componentes de UI

`app-table`, `app-icon`, `app-button`, `app-badge`, `app-card`, `app-page-header`, `app-empty-state`, `app-menu`, `app-drawer`, `app-input`, `app-select`, `app-checkbox`, `app-alert`, `app-pagination`, `app-dialog` y `app-resource-state`. Cada uno tiene una demo en `/ui/<nombre>`.

## Accesibilidad y diseño responsive

Debe pasar AXE y cumplir WCAG AA. El diseño se comprueba a 360, 768 y 1280 px sin scroll horizontal de página.

## Formato

Prettier (`printWidth: 100`, comillas simples). No hay script de lint.
