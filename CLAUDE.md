# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Commands

- `npm start` (`ng serve`): dev server at http://localhost:4200
- `npm run build` (`ng build`): production build into `dist/`
- `npm run watch`: development build in watch mode
- `npm test` (`ng test`): unit tests with Vitest (jsdom). Single file: `ng test --include src/app/app.spec.ts`
- `ng generate component <name>`: scaffold with the Angular CLI
- Formatting uses Prettier (`printWidth: 100`, single quotes, `angular` parser for `*.html`); no lint script is configured.

## Architecture

- Angular 22 standalone app (no NgModules), bootstrapped from `src/main.ts` with `appConfig` in `src/app/app.config.ts` (providers: global error listeners, `provideRouter(routes)`).
- Routing lives in `src/app/app.routes.ts`; root component is `App` (`src/app/app.ts`, with separate `.html`/`.css`). The project is a fresh scaffold, so feature routes should be added there and lazy loaded.
- Styling: Tailwind CSS v4 via PostCSS (`.postcssrc.json`), entry in `src/styles.css`.
- `.mcp.json` registers the Angular CLI MCP server (`npx @angular/cli mcp`); prefer its tools (`list_projects`, `get_best_practices`, `search_documentation`) when available.

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
