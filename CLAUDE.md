# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Commands

- `npm start` (`ng serve`): dev server at http://localhost:4200, con el proxy `/api` → `http://localhost:3000` (`proxy.conf.json`). Si cambias el proxy hay que reiniciar el servidor.
- `npm run build` (`ng build`): production build into `dist/`
- `npm run watch`: development build in watch mode
- `npm test` (`ng test`): unit tests with Vitest (jsdom). Single file: `ng test --include src/app/app.spec.ts`
- `ng generate component <name>`: scaffold with the Angular CLI
- Formatting uses Prettier (`printWidth: 100`, single quotes, `angular` parser for `*.html`); no lint script is configured.

## Architecture

- Angular 22 standalone app (no NgModules), bootstrapped from `src/main.ts` with `appConfig` in `src/app/app.config.ts` (providers: global error listeners, `provideHttpClient(withInterceptors([authInterceptor]))`, un `provideAppInitializer` que restaura la sesión antes de la primera navegación, `provideRouter(routes)` con restauración de scroll, y `PageTitleStrategy` para `document.title`).
- Routing lives in `src/app/app.routes.ts`; root component is `App` (`src/app/app.ts`), que solo monta `<router-outlet />`. Todas las rutas son lazy (ver "Estructura de la app").
- Styling: Tailwind CSS v4 via PostCSS (`.postcssrc.json`), entry in `src/styles.css`. El tema de Material va en `src/material-theme.scss` (ver "Tema y tokens").
- `.mcp.json` registers the Angular CLI MCP server (`npx @angular/cli mcp`); prefer its tools (`list_projects`, `get_best_practices`, `search_documentation`) when available.

## Estructura de la app

La app es el frontend del marketplace agropecuario Mini-Croper. Su backend es `agro-app-workspace` (NestJS, API en `:3000`); las reglas de negocio están en `docs/reglas-de-negocio.md` de ese repo. Auth (sesión, login, registro, cuenta y guards) y el catálogo público (`/catalogo`, detalle de producto, ofertas, tiendas y detalle de tienda) el módulo proveedor (`/proveedor/*`: tienda, productos, presentaciones, stock y pedidos recibidos) y el flujo de compra del productor (carrito, checkout, `/pedidos` y `/pedidos/:id` con sondeo y cronómetro de pago) ya están conectados al backend; el resto de pantallas (`/pedidos/:id/pago`, `/pagos…` y administración) siguen siendo placeholders hasta la SPEC 08.

```
src/app/
├── core/                 # infraestructura de la app (una sola instancia)
│   ├── http/             # API_BASE_URL (`/api`), ApiError, toApiError, resourceApiError (utils/)
│   ├── auth/             # SessionService, AuthApi, SessionRefresher, LogoutService, authInterceptor,
│   │                     # safeReturnUrl, mensajes y validación de auth, tipos (SessionRole, AuthUser…)
│   ├── cart/             # CartService (señales items, total, count, status) y CartApi, tipos del carrito y
│   │                     # MAX_CART_QUANTITY / MAX_CART_LINES; solo importa de http y auth
│   ├── catalog/          # CatalogApi (services/), tipos del catálogo público y de filtros y formatCop;
│   │                     # compartidos por las features (una feature no importa de otra)
│   ├── theme/            # ThemeService y ThemeMenu (claro/oscuro/sistema, clase .app-dark en <html>)
│   ├── navigation/       # NAV_ITEMS, NavigationService, tipos de nav y RouteInfo
│   ├── routing/          # accessGuard, PageTitleStrategy, placeholderRoute, RoutePlaceholder,
│   │                     # Forbidden y NotFound
│   └── layout/           # AppShell, AppHeader, AppSidePanel y AuthLayout (sin index.ts)
├── features/<dominio>/   # index.ts + <dominio>.routes.ts (+ pages/<pantalla>/ si ya está maquetada)
│                         # (catalogo, auth, cuenta, pedidos, pagos, proveedor, admin; proveedor y pedidos ya tienen pantallas reales)
└── shared/ui/            # componentes app-* (únicos que conocen Material/CDK)
```

Detalle de carpetas, `index.ts` y dependencias en "Estructura de un módulo".

- **Rutas en español**, agrupadas por dominio con `loadChildren` y cada pantalla con `loadComponent`. Cada ruta lleva `title` y `data: RouteInfo` (`roles`, `description`, `endpoints` del backend). `placeholderRoute()` crea la ruta con el placeholder; al maquetar una pantalla se cambia su `loadComponent` y se conservan `title` y `data`.
- **Añadir una pantalla:** ruta en `features/<dominio>/<dominio>.routes.ts` y, si debe verse en el panel, un ítem en `NAV_ITEMS` (`core/navigation/config/nav.config.ts`). `core/routing/route-map.spec.ts` comprueba que cada ruta tiene título, roles y endpoints, y que cada ítem del panel apunta a una ruta existente que su rol puede ver.
- **Sesión:** `SessionService` guarda el estado con signals (`status`, `user`, `role`, `isAuthenticated`). El access token vive solo en memoria y el refresh token en `localStorage` (`agro:refresh-token`). Al arrancar, el initializer llama a `POST /auth/refresh` si hay refresh token (solo lo borra ante `400`, `401` o `403`; un error de red lo conserva). No hay cookies: los tokens viajan en el cuerpo JSON. El access token no se escribe nunca en disco ni en logs.
- **HTTP:** `API_BASE_URL` es `/api` y `ng serve` lo reenvía al backend (`:3000`) quitando el prefijo. `authInterceptor` añade `Authorization: Bearer` solo a `/api/*` (nunca a `/auth/login`, `/auth/register` ni `/auth/refresh`), y ante `401` hace un único refresh compartido (con `navigator.locks` entre pestañas) y reintenta una vez. Con el backend apagado el proxy responde `502`: `toApiError` lo trata como "sin conexión" (`status 0`).
- **Guards:** un único `accessGuard` (`canActivateChild`) en las dos rutas layout lee `RouteInfo.roles`: los cuatro roles = pública; solo `['VISITANTE']` = invitado (con sesión redirige a `/catalogo`); sin `VISITANTE` = privada (sin sesión a `/auth/login?returnUrl=…`, con rol no incluido a `/acceso-denegado`); sin `data.roles` no se comprueba. `returnUrl` se valida con `safeReturnUrl` (solo rutas internas). Es una ayuda de UX: el backend sigue siendo la autoridad.
- **Login y registro** viven fuera del shell (`AuthLayout`). `/auth/login` acepta `?returnUrl=` y `?aviso=registro|clave|sesion`; el registro de un `PROVEEDOR` muestra una pantalla de solicitud pendiente en la misma ruta.
- **Layout:** header arriba, panel de navegación a la derecha y la ruta activa al centro (todo lo que no sea `/auth/*`). Desde `lg` (1024 px) el panel es fijo; por debajo es un drawer que entra por la derecha (`app-drawer` envuelve todo el shell). Todo debe verse bien a 360, 768 y 1280 px sin scroll horizontal de página.
- Estado persistido en `localStorage` siempre con `try/catch` y valor por defecto: `agro:theme` y `agro:refresh-token`. La clave heredada `agro:demo-role` se borra al arrancar (`clearLegacyDemoRole`); no la uses.

## Estructura de un módulo

Cada módulo (`core/<modulo>/` o `features/<dominio>/`) usa carpetas por tipo de archivo, creadas **solo cuando tienen contenido** (nunca vacías ni `.gitkeep`):

```text
<modulo>/
  index.ts                  # API pública (exportaciones nombradas, nunca `export *`)
  <dominio>.routes.ts       # solo en features: rutas lazy del dominio
  components/<nombre>/      # componentes que no son una ruta
  pages/<nombre>/           # pantallas que se cargan con loadComponent
  services/                 # @Service / @Injectable (clientes HTTP, estrategias del router)
  guards/                   # CanActivate*, CanMatch*
  interceptors/             # HttpInterceptorFn
  models/                   # tipos, interfaces y constantes de dominio
  utils/                    # funciones puras sin inyección de dependencias
  config/                   # InjectionToken y datos estáticos de configuración
```

- En la raíz del módulo solo van `index.ts`, `<dominio>.routes.ts` y los specs transversales (hoy `core/routing/route-map.spec.ts` y `routing.spec.ts`). Una carpeta nueva fuera de la lista solo se añade si el módulo la necesita, y se agrega aquí en el mismo cambio.
- Cada componente y cada pantalla tiene su propia carpeta. Los `*.spec.ts` van junto al archivo que prueban. Los nombres de archivo no cambian al moverlos; usa `git mv`.
- **`index.ts`:** dentro de un módulo se importa por ruta relativa al archivo; desde fuera (otro módulo, una feature, `app.config.ts`, `app.routes.ts`, specs) solo por `index.ts` (`from '../auth'`). Si algo debe ser público, se añade al `index.ts`.
- **Excepción lazy:** un `index.ts` nunca reexporta pantallas ni layouts cargados con `loadComponent` (Forbidden, NotFound, RoutePlaceholder, Login, Registro, Cuenta, AppShell, AuthLayout…). Se cargan con `import()` directo a su archivo para no meterlos en el bundle principal. `core/layout` no tiene `index.ts`. Las features exponen solo su constante de rutas (`import('./features/<dominio>')`).
- **Dependencias:** `http` ← `auth` ← `navigation` ← `routing` ← `layout`, con `theme` independiente (`layout` puede usarlo), `catalog` que depende solo de `http` (nunca de `auth`, `navigation`, `routing` ni `layout`) y `cart` (`http` ← `auth` ← `cart`) que solo importa de `core/http` y `core/auth`; `layout` y las features pueden usar `core/cart`. `core` y `features` pueden usar `shared/ui`; una feature usa `core` pero nunca otra feature; `core` nunca importa de `features`. Lo compartido entre features va a `core` (p. ej. `core/auth/utils/`).
- `shared/ui`: una carpeta por componente (`<nombre>.ts`, `.types.ts`, `.spec.ts`, `-demo.ts`), sin barrel; `form-control/` solo contiene tipos compartidos.

## Tema y tokens

- Paleta y tipografía de mongodb.com/es, con fuentes libres equivalentes auto-hospedadas (`@fontsource*`): **Source Serif 4** (títulos `h1`–`h3`, `font-serif`), **Figtree** (cuerpo, `font-sans`) y **Source Code Pro** (`font-mono`). No se cargan fuentes de Google Fonts.
- Los colores son variables CSS `--c-*` definidas en `src/styles.css` para claro (`:root`) y oscuro (`.app-dark`), expuestas a Tailwind: `bg-bg`, `bg-surface`, `bg-sunken`, `text-fg`, `text-fg-muted`, `border-line`, `border-line-strong`, `bg-brand`, `text-on-brand`, `text-brand-text`, `bg-brand-soft`, `text-info`, `text-danger`, `text-warning`. **Usa estos tokens; no hardcodees colores** ni uses `dark:` para cambiar de color (el token ya cambia solo).
- En claro el verde `#00ed64` solo va como relleno con texto `text-on-brand`; como texto sobre fondo claro se usa `text-brand-text`.
- Bordes redondeados en todo: `rounded-sm` (8 px), `rounded-md` (12), `rounded-lg` (16), `rounded-xl` (24) y `rounded-pill`. Botones y badges son `pill`, tarjetas y panel `xl`, controles `md`. Material los recibe mediante `--mat-sys-corner-*` en `src/material-theme.scss`.
- Los roles de Material (`--mat-sys-*`) se sobrescriben con los mismos tokens, así Tailwind y Material comparten un único origen de color.
- Al comprobar contraste con AXE, espera a que termine `transition-colors` tras cambiar de tema (≈ 700 ms) o saldrán falsos positivos.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Componentes de UI

- Toda tarea que necesite un componente de UI nuevo (o una feature nueva en uno existente) DEBE invocar la skill `ui-component` (`.claude/skills/ui-component/SKILL.md`) antes de escribir código.
- Los componentes de UI viven en `src/app/shared/ui/` como wrappers propios con prefijo `app-` y API con tipos propios.
- Está PROHIBIDO importar `@angular/material/*` y `@angular/cdk/*` fuera de `src/app/shared/ui/`. El tema de Material vive en `src/material-theme.scss` y se registra en `angular.json`.
- Las features y páginas consumen solo los componentes `app-*`, nunca `mat-*` ni utilidades del CDK directamente.
- No se usa PrimeNG: se eliminó por su licencia (ver `specs/01-skill-ui-component-y-tabla.md`).
- Componentes disponibles (cada uno con demo en `/ui/<nombre>`): `app-table`, `app-icon`, `app-button`, `app-badge`, `app-card`, `app-page-header`, `app-empty-state`, `app-menu`, `app-drawer`, `app-input`, `app-select`, `app-checkbox`, `app-alert`, `app-pagination` y `app-resource-state` (cargando, error con Reintentar, vacío o contenido). `app-input` admite `type="number"` (valor `number | null`). Antes de crear uno nuevo, revisa si ya existe o si basta ampliar uno.
- Los controles sin texto visible llevan `ariaLabel`; `app-icon` es decorativo salvo que reciba `label`.
- `app-input`, `app-select` y `app-checkbox` son controles de Signal Forms: se enlazan con `[formField]` y muestran el primer error con `message` cuando el campo está tocado. Los formularios usan `form(model, schema, { submission })` con `[formRoot]`.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection
