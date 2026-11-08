# SPEC 04 — Arquitectura de carpetas por módulo (core, features y shared)

> **Status:** Borrador
> **Depends on:** SPEC 01, SPEC 02, SPEC 03
> **Date:** 2026-11-08
> **Objective:** Reorganizar `src/app` con una estructura estándar de carpetas por tipo de archivo, un `index.ts` como API pública por módulo y una dirección de dependencias sin ciclos (la misma idea que `apps/api/src/modules/` del backend), y dejarla escrita como regla en `CLAUDE.md` para todo código nuevo.

---

## Por qué existe esta spec

La SPEC 03 dejó `core/auth/` con 17 archivos planos: guard, interceptor, servicios, tipos, utilidades y sus specs mezclados. Es difícil ver de un vistazo qué hay, y cada módulo nuevo copiaría ese desorden o inventaría el suyo. El backend (`agro-app-workspace`) resolvió lo mismo en su SPEC 04 (`specs/04-estructura-de-modulos.md`): carpetas por tipo, `index.ts` como API pública y una regla en `CLAUDE.md`. Esta spec lo adapta a Angular.

Es un **refactor puro**: no cambia comportamiento, rutas, endpoints, estilos ni textos. Solo mueve archivos, ajusta imports y crea `index.ts`.

Hallazgos de la auditoría del 2026-11-08 que la spec corrige:

- **Ciclo entre `core/auth` y `core/navigation`.** `access.guard.ts` (auth) importa `RouteInfo` de navigation, y navigation importa `SessionRole` y `SessionService` de auth. Con barrels (`index.ts`) sería un ciclo real. Se resuelve moviendo el guard a `core/routing`, que ya depende de ambos.
- **Dependencia entre features.** `features/cuenta/cuenta.ts` importa `auth-messages` y `register-validation` desde `features/auth/`. Son reglas del dominio auth (mensajes de error y política de contraseña) usadas por dos features, así que pasan a `core/auth/utils/`.
- **Numeración.** La SPEC 03 reservaba el número 04 para maquetar las pantallas con datos mock. Esa spec pasa a ser la **SPEC 05** y se redacta después con `/spec`.

## Alcance

**Dentro:**

- **Vocabulario de carpetas** (ver "Modelo de datos"): `components/`, `pages/`, `services/`, `guards/`, `interceptors/`, `models/`, `utils/` y `config/`, creadas **solo cuando tienen contenido** (nunca vacías ni `.gitkeep`).
- **`core/*`**: `auth`, `http`, `theme`, `navigation`, `routing` y `layout` con la estructura estándar.
- **`features/*`**: `auth`, `cuenta`, `catalogo`, `pedidos`, `pagos`, `proveedor` y `admin`.
- **`shared/ui`**: se formaliza la convención que ya cumple (una carpeta por componente) y se audita; sin mover componentes.
- **`index.ts` por módulo** como API pública (con exportaciones nombradas explícitas, sin `export *`).
- **Dirección de dependencias** escrita y verificable: `http` ← `auth` ← `navigation` ← `routing` ← `layout`; `theme` independiente; `features` solo depende de `core` y `shared`, nunca de otra feature.
- **Mover el `accessGuard`** de `core/auth` a `core/routing/guards/`.
- **Mover `auth-messages` y `register-validation`** de `features/auth` a `core/auth/utils/`.
- **Movimiento con `git mv`** (conserva historial) y actualización de imports en `src/app/app.config.ts`, `src/app/app.routes.ts`, specs y demás referencias.
- **Regla en `CLAUDE.md`**: nueva sección con el árbol, las reglas de ubicación y la del `index.ts`; actualizar el árbol de "Estructura de la app".

**Fuera de alcance (otras specs):**

- Cualquier cambio de comportamiento, ruta, endpoint, estilo, texto o dependencia npm.
- Mover los specs a una carpeta `tests/`: se quedan colocados junto a su archivo (convención de Angular).
- Regla de lint que haga cumplir la estructura o el `index.ts` (no hay lint configurado; queda como convención escrita).
- Alias de rutas en `tsconfig` (`@core/*`, `@shared/*`).
- Renombrar archivos o clases (los nombres no cambian, aunque `register-validation.ts` ahora lo usen dos pantallas).
- Unificar `NETWORK_MESSAGE` (`auth-messages.ts`) y `NETWORK_ERROR_MESSAGE` (`to-api-error.ts`), que hoy duplican el mismo texto.
- Un `index.ts` raíz para `shared/ui` o uno por componente.
- Maquetar pantallas con datos mock (SPEC 05).

## Modelo de datos

Esta spec no introduce datos, tipos ni claves de `localStorage`. Fija la estructura de carpetas.

**Vocabulario estándar** de un módulo (`core/<modulo>/` o `features/<dominio>/`):

```text
<modulo>/
  index.ts                  # API pública (solo si exporta algo importable de forma estática)
  <dominio>.routes.ts       # solo en features: rutas lazy del dominio
  components/<nombre>/      # componentes que no son una ruta (<nombre>.ts, .html, .css, .types.ts, .spec.ts)
  pages/<nombre>/           # pantallas que se cargan con loadComponent
  services/                 # clases @Service / @Injectable (incluye clientes HTTP y estrategias del router)
  guards/                   # CanActivate*, CanMatch*
  interceptors/             # HttpInterceptorFn
  models/                   # tipos, interfaces y constantes de dominio
  utils/                    # funciones puras sin inyección de dependencias
  config/                   # InjectionToken y datos estáticos de configuración
```

Reglas de la estructura:

- En la raíz de un módulo solo van `index.ts`, `<dominio>.routes.ts` (features) y los specs transversales que no prueban un único archivo (hoy `core/routing/route-map.spec.ts` y `routing.spec.ts`).
- Los `*.spec.ts` van **junto al archivo que prueban**, con su mismo nombre más `.spec.ts`.
- Cada componente y cada pantalla tiene **su propia carpeta** (igual que `shared/ui` y que `ng generate component`), aunque hoy sea un solo `.ts` con plantilla inline.
- Los nombres de archivo no cambian; solo cambia la carpeta.
- Una carpeta nueva fuera de la lista solo se añade si el módulo la necesita de verdad, y se agrega a la lista en `CLAUDE.md` en el mismo cambio.

**Estructura resultante de `core/`:**

```text
src/app/core/
  http/
    index.ts
    config/api-config.ts
    models/api-error.ts
    utils/to-api-error.ts
  auth/
    index.ts
    models/auth.types.ts
    services/{auth-api,session,session-refresher,logout}.ts
    interceptors/auth.interceptor.ts
    utils/{safe-return-url,auth-messages,register-validation}.ts
  theme/
    index.ts
    models/theme.types.ts
    services/theme.ts
    components/theme-menu/theme-menu.ts
  navigation/
    index.ts
    config/nav.config.ts
    models/navigation.types.ts
    services/navigation.ts
    utils/legacy-demo-role.ts
  routing/
    index.ts
    guards/access.guard.ts                       # antes core/auth/access.guard.ts
    services/page-title.strategy.ts
    utils/placeholder-route.ts
    components/route-placeholder/route-placeholder.ts
    pages/forbidden/forbidden.ts
    pages/not-found/not-found.ts
    route-map.spec.ts                            # transversales, en la raíz
    routing.spec.ts
  layout/                                        # sin index.ts: todo se carga con import() desde app.routes
    components/app-header/app-header.ts
    components/app-side-panel/app-side-panel.ts
    components/app-shell/app-shell.ts
    components/auth-layout/auth-layout.ts
```

Cada archivo conserva su `*.spec.ts` al lado, dentro de la misma carpeta.

**Estructura resultante de `features/`:**

```text
src/app/features/
  auth/
    index.ts                                     # exporta AUTH_ROUTES
    auth.routes.ts
    pages/login/login.ts
    pages/registro/registro.ts
  cuenta/
    index.ts                                     # exporta CUENTA_ROUTES
    cuenta.routes.ts
    pages/cuenta/cuenta.ts
  catalogo/ pedidos/ pagos/ proveedor/ admin/    # cada una: index.ts + <dominio>.routes.ts
```

**`shared/ui`:** sin cambios de estructura. Cada componente es una carpeta `shared/ui/<nombre>/` con `<nombre>.ts`, `<nombre>.types.ts`, `<nombre>.spec.ts`, `<nombre>-demo.ts` y, si hace falta, `.html`, `.css` y archivos auxiliares propios (p. ej. `table/table-cell.ts`). `form-control/` es la excepción: contiene solo los tipos compartidos de los controles de formulario. Se importa el archivo del componente y su `.types.ts` directamente, sin barrel.

**Contenido de cada `index.ts`** (nombrado y explícito; la lista final es lo que hoy se importa desde fuera del módulo):

| Módulo | Exporta |
| --- | --- |
| `core/http` | `API_BASE_URL`, `ApiError`, `toApiError`, `NETWORK_ERROR_MESSAGE` |
| `core/auth` | `SessionService`, `SessionRefresher`, `AuthApi`, `LogoutService`, `authInterceptor`, `safeReturnUrl`, `DEFAULT_RETURN_URL`, `loginErrorMessage`, `loginNotice`, `registerErrorMessage`, `changePasswordErrorMessage`, `passwordProblems`, `isValidName`, `isValidDocument` y los tipos y constantes de `auth.types.ts` |
| `core/theme` | `ThemeService`, `ThemeMenu`, tipos de tema |
| `core/navigation` | `NAV_ITEMS`, `SESSION_ROLE_LABELS`, `NavigationService`, `clearLegacyDemoRole`, tipos de navegación y `RouteInfo` |
| `core/routing` | `accessGuard`, `PageTitleStrategy`, `placeholderRoute`, `ALL_ROLES` |
| `core/layout` | No tiene `index.ts` |
| `features/<dominio>` | Solo su constante de rutas (`AUTH_ROUTES`, `CUENTA_ROUTES`, `CATALOGO_ROUTES`, `PEDIDOS_ROUTES`, `PAGOS_ROUTES`, `PROVEEDOR_ROUTES`, `ADMIN_ROUTES`) |

Reglas de imports:

- Dentro de un módulo se importa por ruta relativa al archivo concreto.
- Desde fuera (otro módulo de `core`, una feature, `app.config.ts`, `app.routes.ts`) solo se importa por `index.ts`: `from '../auth'`, `from './core/auth'`.
- **Un `index.ts` nunca reexporta pantallas ni layouts cargados con `loadComponent`** (Forbidden, NotFound, RoutePlaceholder, Login, Registro, Cuenta, AppShell, AuthLayout…). Se cargan con `import()` directo a su archivo, y esa es la única excepción a la regla anterior: un barrel los metería en el bundle principal.
- Los specs importan el archivo interno de su módulo por ruta relativa y, para cualquier otro módulo, por su `index.ts`.
- Dependencias permitidas: `http` ← `auth` ← `navigation` ← `routing` ← `layout`, con `theme` independiente y `layout` pudiendo usar `theme`; `core` y `features` pueden usar `shared/ui`; `features` usa `core` pero no otra feature; `core` nunca importa de `features`.

## Plan de implementación

Cada paso deja la app compilando, con `ng test` en verde y `ng build` sin errores. Los archivos se mueven con `git mv`, con su spec.

1. **Línea base y requisito previo.** Confirmar que los cambios de la SPEC 03 están commiteados (`git mv` no funciona con archivos sin seguimiento y `git log --follow` no tendría historial). Anotar el número de tests que reporta `ng test`, la lista de chunks lazy de `ng build` y el resultado de `grep -rnE "@angular/(material|cdk)" src/app` fuera de `shared/ui`.
2. **`core/http`.** Crear `config/`, `models/`, `utils/`; mover los tres archivos; crear `index.ts`; ajustar los imports que apuntan a `core/http/*`.
3. **`core/theme`.** Crear `models/`, `services/`, `components/theme-menu/`; mover archivos y specs; crear `index.ts`; ajustar imports (`app-header`, `auth-layout`, specs).
4. **`core/auth` y el guard.** Crear `models/`, `services/`, `interceptors/`, `utils/`; mover `auth-api`, `session`, `session-refresher`, `logout`, `auth.interceptor`, `auth.types` y `safe-return-url` con sus specs. Mover `auth-messages` y `register-validation` (con specs) desde `features/auth` a `core/auth/utils/`, y mover `access.guard.ts` y su spec a `core/routing/guards/`. Crear `core/auth/index.ts` y ajustar imports de `features/auth` y `features/cuenta`. Si el guard queda fuera de lugar entre pasos, `app.routes.ts` lo importa por su ruta nueva en este mismo paso.
5. **`core/navigation`.** Crear `config/`, `models/`, `services/`, `utils/`; mover `nav.config`, `navigation.types`, `navigation`, `legacy-demo-role` y sus specs; crear `index.ts`; ajustar imports (`app-side-panel`, `route-placeholder`, `placeholder-route`, `cuenta`, `app.config.ts`).
6. **`core/routing`.** Crear `guards/`, `services/`, `utils/`, `components/route-placeholder/`, `pages/forbidden/` y `pages/not-found/`; mover archivos; dejar `route-map.spec.ts` y `routing.spec.ts` en la raíz; crear `index.ts` (sin las pantallas); ajustar `loadComponent` de `placeholder-route.ts` y la ruta `/acceso-denegado` en `app.routes.ts` a la ruta nueva de cada pantalla.
7. **`core/layout`.** Crear `components/<nombre>/` para `app-header`, `app-side-panel`, `app-shell` y `auth-layout` con sus specs; ajustar los `import()` de `app.routes.ts`. Sin `index.ts`.
8. **`features/*`.** Para `auth` y `cuenta`: crear `pages/<nombre>/`, mover `login`, `registro` y `cuenta` con sus specs. En las siete features, crear `index.ts` que exporte la constante de rutas y cambiar `app.routes.ts` para cargar `import('./features/<dominio>')`. Ajustar los imports de `placeholderRoute` y `ALL_ROLES` a `core/routing`.
9. **`shared/ui`.** Auditar que cada carpeta cumple la convención (sin archivos sueltos en `shared/ui/` ni carpetas vacías) y corregir las desviaciones que aparezcan. Si no hay ninguna, no se toca nada.
10. **Reglas y cierre.** Actualizar `CLAUDE.md`: sección "Estructura de un módulo" (vocabulario, ubicación, specs colocados, `index.ts`, excepción del `import()` lazy, dirección de dependencias) y el árbol de "Estructura de la app". Ejecutar la verificación completa y el recorrido manual (`npm start`: `/catalogo`, `/auth/login`, `/auth/registro`, `/cuenta`, `/acceso-denegado` y un `/ui/*`).

## Criterios de aceptación

- [ ] En la raíz de cada módulo de `core/` y `features/` solo existen `index.ts`, `<dominio>.routes.ts`, los specs transversales de `core/routing` y carpetas del vocabulario estándar.
- [ ] No hay carpetas vacías ni `.gitkeep` en `src/app`.
- [ ] Cada componente y cada pantalla de `core/` y `features/` está en su carpeta `components/<nombre>/` o `pages/<nombre>/`, y cada spec está junto al archivo que prueba.
- [ ] `core/` y `features/` coinciden con los árboles de "Modelo de datos".
- [ ] `accessGuard` vive en `core/routing/guards/`, y `auth-messages` y `register-validation` en `core/auth/utils/`; `features/auth` ya no contiene lógica compartida.
- [ ] Ninguna feature importa de otra feature: `grep -rnE "from '(\.\./)+(auth|cuenta|catalogo|pedidos|pagos|proveedor|admin)(/|')" src/app/features` solo devuelve imports de `core`/`shared` que no sean de features (es decir, vacío para rutas a otra feature).
- [ ] Ningún `import` estático apunta a un archivo interno de otro módulo: `grep -rnE "from '(\.\./)+(http|auth|theme|navigation|routing|layout)/[^']+/" src/app/core src/app/features src/app/app.*.ts` y el equivalente con `./core/…` devuelven vacío (los `import()` dinámicos a pantallas y layouts son la única excepción).
- [ ] No hay dependencias en sentido contrario al declarado: `core/http` no importa de otros módulos de `core`; `core/auth` solo de `core/http`; `core/navigation` solo de `core/auth`; `core/routing` solo de `core/auth` y `core/navigation`; `core/theme` de ninguno; `core/` no importa de `features/`.
- [ ] Ningún `index.ts` reexporta pantallas ni layouts, y los chunks lazy de login, registro, cuenta, acceso denegado, `AppShell` y `AuthLayout` siguen apareciendo como chunks aparte en la salida de `ng build`.
- [ ] Ningún `index.ts` usa `export *`.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`, igual que antes.
- [ ] `ng test` reporta el mismo número de tests que la línea base y todos pasan.
- [ ] `npm run build` termina sin errores ni avisos nuevos.
- [ ] `git log --follow` sobre un archivo movido (p. ej. `core/auth/services/session.ts`) muestra su historial anterior.
- [ ] `git diff` no contiene cambios de comportamiento: fuera de mover archivos y editar sentencias `import`/`export`, solo cambian los `index.ts` nuevos, `app.config.ts`, `app.routes.ts`, rutas de `loadComponent` y `CLAUDE.md`.
- [ ] En el recorrido manual, `/catalogo`, `/auth/login`, `/auth/registro`, `/cuenta`, `/acceso-denegado` y un `/ui/*` se ven y funcionan igual que antes (sin errores de consola).
- [ ] `CLAUDE.md` tiene la sección "Estructura de un módulo" con vocabulario, reglas de ubicación, `index.ts`, excepción lazy y dirección de dependencias, y su árbol de "Estructura de la app" coincide con el código.
- [ ] `specs/03-modulo-auth-sesion-y-guards.md` no se modifica.

## Decisiones tomadas y descartadas

- **Sí:** carpetas por tipo de archivo, como el backend. La regla es mecánica («un guard va en `guards/`») y cada módulo nuevo la aplica igual sin interpretar.
- **No:** carpetas por subfuncionalidad (`session/`, `refresh/`, `guard/`). Más cohesivo pero subjetivo; cada dominio trazaría los límites distinto.
- **No:** estructura híbrida (carpeta solo si hay más de 3 archivos del mismo tipo). Obliga a mover archivos al crecer y hace impredecible dónde buscar.
- **Sí:** specs colocados junto a su archivo. Es la convención de Angular y `ng generate` los crea así. Se descartó la carpeta `tests/` plana del backend porque aquí se aparta de la herramienta sin ganar claridad.
- **Sí, excepción:** `route-map.spec.ts` y `routing.spec.ts` en la raíz de `core/routing`. Prueban el árbol de rutas completo, no un solo archivo.
- **Sí:** alcance en todo `src/app`. Dejar `features` o `shared` fuera haría convivir dos formas de organizar un módulo.
- **Sí:** una carpeta por componente y por pantalla, aunque hoy sean un solo `.ts`. Coincide con `shared/ui` y con `ng generate component`, y evita mover archivos cuando una pantalla gane `.html`, `.css` o subcomponentes.
- **Sí:** `index.ts` como API pública con exportaciones nombradas. Hace verificable la regla de no importar archivos internos de otro módulo. Con `export *` cualquier archivo nuevo se volvería público sin decidirlo.
- **Sí:** el `import()` directo a pantallas y layouts es la excepción a la regla del `index.ts`. Un barrel las arrastraría al bundle principal y rompería el lazy loading de la SPEC 02.
- **No:** `index.ts` raíz (o por componente) en `shared/ui`. Quince componentes en un barrel mezclarían demos y tipos, y cada carpeta ya expone dos archivos claros (`<nombre>.ts` y `<nombre>.types.ts`).
- **Sí:** mover `accessGuard` a `core/routing/guards/`. Es lo que rompe el ciclo `auth` ↔ `navigation`: el guard lee `RouteInfo` y decide con la sesión, así que pertenece a la capa que depende de ambos.
- **No:** mover `RouteInfo` a `core/auth` o crear un módulo `core/types`. Traería un tipo de navegación a auth o inventaría un módulo solo para evitar el ciclo.
- **Sí:** `auth-messages` y `register-validation` pasan a `core/auth/utils/`. Los usan `auth` y `cuenta`, y una feature no puede depender de otra.
- **No:** dejarlas en `features/auth` y que `cuenta` las importe por `features/auth/index.ts`. Mantiene la dependencia entre features y mezcla utilidades con las rutas lazy.
- **No:** renombrar `register-validation.ts` ni unificar los mensajes de red duplicados. Un refactor de solo movimiento es fácil de revisar y de revertir.
- **Sí:** dirección de dependencias escrita y verificable con `grep`. Sin lint, es la única forma de que la regla no se pierda.
- **No:** regla de lint ni alias `@core/*` en este refactor. Es tooling aparte; las rutas relativas siguen funcionando.
- **Sí:** `git mv` y requisito de tener la SPEC 03 commiteada. El diff queda como renombrados y se conserva el historial.
- **No:** editar la SPEC 03. Es la foto del momento (menciona `core/auth/access.guard.ts`); la fuente vigente de la estructura es `CLAUDE.md`.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Los cambios de la SPEC 03 siguen sin commitear y `git mv` falla con archivos sin seguimiento | El paso 1 exige commitearlos antes de empezar; criterio de aceptación de `git log --follow`. |
| Un barrel arrastra una pantalla lazy al bundle principal y se pierde el lazy loading | Regla explícita (los `index.ts` no reexportan pantallas ni layouts), criterio de aceptación sobre los chunks de `ng build` y comparación con la línea base del paso 1. |
| Ciclo de imports entre barrels (`auth` ↔ `navigation`) | Se resuelve moviendo el guard a `routing`; la dirección de dependencias se verifica con `grep` al cerrar cada paso. |
| Imports rotos en archivos que bajan un nivel (rutas `../../shared/ui/...` ganan un nivel) | Ajustarlos en el mismo paso y correr `ng test` y `ng build` antes de seguir. |
| `import('./features/<dominio>')` no resuelve el directorio con `module: preserve` | Probarlo en la primera feature (paso 8); si falla, usar `import('./features/<dominio>/index')`. |
| Specs que apuntan a rutas viejas fallan en silencio o no se descubren | El número de tests de `ng test` debe coincidir con la línea base. |
| Mover `app-shell` y `auth-layout` rompe `app.routes.ts` o `app.spec.ts` | Se actualizan en el paso 7 junto con el movimiento; `ng test` y `ng build` al final de cada paso. |
| Los componentes nuevos futuros ignoran la estructura | Queda en `CLAUDE.md`, que se carga en cada sesión, y es criterio de aceptación de cada spec de pantalla. |
| `.claude/skills/ui-component/SKILL.md` u otros archivos citan rutas movidas | Buscar con `grep` las rutas viejas (`core/auth/`, `features/auth/login`) en `.claude/` y `CLAUDE.md` al cerrar. |

## Lo que **no** está en esta spec

- Cambios de comportamiento, rutas, endpoints, estilos o textos.
- Carpeta `tests/` para los specs, lint que haga cumplir la estructura y alias de `tsconfig`.
- Renombrar archivos o clases, y unificar mensajes duplicados.
- Barrel para `shared/ui`.
- Maquetar pantallas con datos mock (SPEC 05).

Cada uno de estos, si se aborda, va en su propio spec.
