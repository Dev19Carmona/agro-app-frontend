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

La app es el frontend del marketplace agropecuario Mini-Croper. Su backend es `agro-app-workspace` (NestJS, API en `:3000`); las reglas de negocio están en `docs/reglas-de-negocio.md` de ese repo. Auth (sesión, login, registro, cuenta y guards) ya está conectado al backend; el resto de pantallas siguen siendo placeholders hasta la SPEC 04.

```
src/app/
├── core/                 # infraestructura de la app (una sola instancia)
│   ├── auth/             # SessionService (estado), AuthApi, SessionRefresher, authInterceptor,
│   │                     # accessGuard, safeReturnUrl, LogoutService y tipos (SessionRole, AuthUser…)
│   ├── http/             # API_BASE_URL (`/api`), ApiError y toApiError
│   ├── theme/            # ThemeService y ThemeMenu (claro/oscuro/sistema, clase .app-dark en <html>)
│   ├── navigation/       # NAV_ITEMS, NavigationService, tipos de nav y RouteInfo
│   ├── layout/           # AppShell (header + panel derecho + contenido), AppHeader, AppSidePanel,
│   │                     # AuthLayout (login y registro, pantalla completa sin header ni panel)
│   └── routing/          # placeholderRoute, RoutePlaceholder, NotFound, Forbidden, PageTitleStrategy
├── features/<dominio>/   # <dominio>.routes.ts con las rutas lazy de ese dominio
│                         # (catalogo, auth, cuenta, pedidos, pagos, proveedor, admin)
└── shared/ui/            # componentes app-* (únicos que conocen Material/CDK)
```

- **Rutas en español**, agrupadas por dominio con `loadChildren` y cada pantalla con `loadComponent`. Cada ruta lleva `title` y `data: RouteInfo` (`roles`, `description`, `endpoints` del backend). `placeholderRoute()` crea la ruta con el placeholder; al maquetar una pantalla se cambia su `loadComponent` y se conservan `title` y `data`.
- **Añadir una pantalla:** ruta en `features/<dominio>/<dominio>.routes.ts` y, si debe verse en el panel, un ítem en `NAV_ITEMS` (`core/navigation/nav.config.ts`). `core/routing/route-map.spec.ts` comprueba que cada ruta tiene título, roles y endpoints, y que cada ítem del panel apunta a una ruta existente que su rol puede ver.
- **Sesión:** `SessionService` guarda el estado con signals (`status`, `user`, `role`, `isAuthenticated`). El access token vive solo en memoria y el refresh token en `localStorage` (`agro:refresh-token`). Al arrancar, el initializer llama a `POST /auth/refresh` si hay refresh token (solo lo borra ante `400`, `401` o `403`; un error de red lo conserva). No hay cookies: los tokens viajan en el cuerpo JSON. El access token no se escribe nunca en disco ni en logs.
- **HTTP:** `API_BASE_URL` es `/api` y `ng serve` lo reenvía al backend (`:3000`) quitando el prefijo. `authInterceptor` añade `Authorization: Bearer` solo a `/api/*` (nunca a `/auth/login`, `/auth/register` ni `/auth/refresh`), y ante `401` hace un único refresh compartido (con `navigator.locks` entre pestañas) y reintenta una vez. Con el backend apagado el proxy responde `502`: `toApiError` lo trata como "sin conexión" (`status 0`).
- **Guards:** un único `accessGuard` (`canActivateChild`) en las dos rutas layout lee `RouteInfo.roles`: los cuatro roles = pública; solo `['VISITANTE']` = invitado (con sesión redirige a `/catalogo`); sin `VISITANTE` = privada (sin sesión a `/auth/login?returnUrl=…`, con rol no incluido a `/acceso-denegado`); sin `data.roles` no se comprueba. `returnUrl` se valida con `safeReturnUrl` (solo rutas internas). Es una ayuda de UX: el backend sigue siendo la autoridad.
- **Login y registro** viven fuera del shell (`AuthLayout`). `/auth/login` acepta `?returnUrl=` y `?aviso=registro|clave|sesion`; el registro de un `PROVEEDOR` muestra una pantalla de solicitud pendiente en la misma ruta.
- **Layout:** header arriba, panel de navegación a la derecha y la ruta activa al centro (todo lo que no sea `/auth/*`). Desde `lg` (1024 px) el panel es fijo; por debajo es un drawer que entra por la derecha (`app-drawer` envuelve todo el shell). Todo debe verse bien a 360, 768 y 1280 px sin scroll horizontal de página.
- Estado persistido en `localStorage` siempre con `try/catch` y valor por defecto: `agro:theme` y `agro:refresh-token`. La clave heredada `agro:demo-role` se borra al arrancar (`clearLegacyDemoRole`); no la uses.

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
- Componentes disponibles (cada uno con demo en `/ui/<nombre>`): `app-table`, `app-icon`, `app-button`, `app-badge`, `app-card`, `app-page-header`, `app-empty-state`, `app-menu`, `app-drawer`, `app-input`, `app-select`, `app-checkbox` y `app-alert`. Antes de crear uno nuevo, revisa si ya existe o si basta ampliar uno.
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
