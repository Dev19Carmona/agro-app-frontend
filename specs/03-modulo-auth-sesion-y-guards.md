# SPEC 03 — Módulo Auth: sesión real, login, registro, cuenta y guards

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-08
> **Objective:** Conectar el frontend con los endpoints `/auth/*` del backend para que el usuario pueda registrarse, iniciar y cerrar sesión, ver y proteger rutas según su rol real (visitante, productor, proveedor o admin) y reemplazar el rol de demo del header.

---

## Por qué existe esta spec

La SPEC 02 dejó la app como puro diseño: un selector de rol de demo filtraba el panel y cualquier URL era accesible. Esta spec lo sustituye por sesión real contra `agro-app-workspace` (NestJS, `:3000`). Las reglas de negocio de referencia son `docs/reglas-de-negocio.md` del backend, secciones "Cuentas y acceso" y "Seguridad y permisos".

La SPEC 02 reservaba el número 03 para maquetar las pantallas con datos mock. Esa spec pasa a ser la **SPEC 04** y se redacta después con `/spec`.

Contrato del backend que esta spec consume (verificado en `apps/api/src/modules/auth/` el 2026-11-08):

- `POST /auth/login` → `{ accessToken, refreshToken, tokenType: 'Bearer', expiresIn, user }`. 5 intentos por minuto por IP; 5 fallos bloquean la cuenta 15 min. Email inexistente, clave incorrecta y cuenta bloqueada responden igual (`401`). El estado de la cuenta (`403`: pendiente, rechazada o deshabilitada) solo se revela con la clave correcta.
- `POST /auth/register` → `PublicUser`, sin tokens. `PRODUCTOR` queda `ACTIVE`; `PROVEEDOR` queda `PENDING_APPROVAL`. Email repetido responde `409`.
- `POST /auth/refresh` con `{ refreshToken }`. El refresh token rota en cada uso y reutilizar uno ya usado revoca toda la sesión. 10 por minuto.
- `POST /auth/logout` (`204`), `GET /auth/me` (`Profile`, con `storeId` opcional), `POST /auth/change-password` (`204`, cierra todas las sesiones).
- Access token de 15 min y refresh token de 7 días. No hay cookies, los tokens viajan en el cuerpo JSON.
- Sin prefijo global: las rutas son `/auth/login`, no `/api/auth/login`.

## Alcance

**Dentro:**

- `SessionService` (`src/app/core/auth/`): estado de sesión con signals, access token en memoria y refresh token en `localStorage` (`agro:refresh-token`).
- Restauración de sesión al arrancar: si hay refresh token, `POST /auth/refresh` antes de la primera navegación, para que los guards sepan quién es el usuario.
- `AuthApi`: login, registro, refresh, logout, perfil y cambio de contraseña.
- Interceptor HTTP: añade `Authorization: Bearer`, y ante `401` renueva una sola vez (compartido entre peticiones simultáneas) y reintenta.
- Proxy de `ng serve`: `/api` → `http://localhost:3000` reescribiendo el prefijo, y token `API_BASE_URL` con valor `/api`.
- Guard único `accessGuard` que lee `RouteInfo.roles` de cada ruta, más la página `/acceso-denegado`.
- Rutas `/auth/login` y `/auth/registro` fuera del shell, con un `AuthLayout` centrado a pantalla completa.
- Pantalla de login, con `returnUrl` validado y avisos por `?aviso=`.
- Pantalla de registro (`email`, `password`, `nombre`, `documento`, `rol`, `aceptaTratamientoDatos`), con pantalla de éxito distinta para `PROVEEDOR` (pendiente de aprobación).
- Pantalla `/cuenta`: perfil (`GET /auth/me`), cambio de contraseña y cierre de sesión.
- Header: se elimina el selector de rol de demo. El visitante ve un botón **Iniciar sesión**; el autenticado ve un menú de usuario con **Mi cuenta** y **Cerrar sesión**.
- El panel de navegación filtra por el rol real de la sesión.
- Componentes UI nuevos, creados con la skill `ui-component`: `app-input`, `app-select`, `app-checkbox` y `app-alert`, cada uno con demo en `/ui/<nombre>` y compatibles con Signal Forms.
- Validación del cliente que replica la política del backend (contraseña, documento, nombre, email) solo como ayuda de UX.
- Actualizar `CLAUDE.md` y `route-map.spec.ts`.

**Fuera de alcance (otras specs):**

- Maquetar el resto de pantallas con datos mock (SPEC 04).
- Pantallas de administración de usuarios (aprobar, rechazar, deshabilitar, cambiar rol).
- Recuperar contraseña y verificar email (el backend no tiene endpoints).
- Renovación proactiva del token antes de que expire (solo se renueva ante `401`).
- Sincronizar el cierre de sesión entre pestañas.
- "Recordarme", 2FA, login social.
- Política CSP y endurecimiento de cabeceras.
- Despliegue y configuración de producción del proxy inverso.
- Internacionalización y tests e2e.

## Modelo de datos

```ts
// src/app/core/auth/auth.types.ts
export type AppRole = 'PRODUCTOR' | 'PROVEEDOR' | 'ADMIN';
export type SessionRole = 'VISITANTE' | AppRole; // sustituye a DemoRole
export type UserStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED';

export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  rol: AppRole;
  status: UserStatus;
}
export interface Profile extends AuthUser {
  storeId?: string;
}

export interface LoginRequest { email: string; password: string }
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // segundos
  user: AuthUser;
}
export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  documento: string;
  rol: 'PRODUCTOR' | 'PROVEEDOR';
  aceptaTratamientoDatos: true;
}
export interface ChangePasswordRequest { currentPassword: string; newPassword: string }

// Estado de la sesión
export type SessionStatus = 'restoring' | 'anonymous' | 'authenticated';
export const REFRESH_TOKEN_STORAGE_KEY = 'agro:refresh-token';

// src/app/core/http/api-error.ts
export interface ApiError { status: number; message: string } // `message` del cuerpo de error del backend

// src/app/core/navigation/navigation.types.ts
// `DemoRole` y `DEMO_ROLE_STORAGE_KEY` desaparecen; `NavItem.roles` y `RouteInfo.roles` usan `SessionRole`.
```

Convenciones:

- Claves de `localStorage`: `agro:refresh-token` (nueva), `agro:theme` (se mantiene). `agro:demo-role` se elimina y se borra del navegador si existe. Todo acceso a `localStorage` va en `try/catch` con valor por defecto.
- El access token nunca se escribe en `localStorage`, `sessionStorage` ni en logs.
- Semántica de `RouteInfo.roles` para el guard:
  - Contiene los cuatro valores: ruta pública, sin comprobación.
  - Es solo `['VISITANTE']` (login, registro): ruta de invitado. Si ya hay sesión, redirige a `/catalogo`.
  - No contiene `VISITANTE`: ruta privada. Sin sesión redirige a `/auth/login?returnUrl=<url>`; con sesión y rol no incluido, a `/acceso-denegado`.
  - Una ruta sin `data.roles` (404, demos `/ui/*`) no se comprueba.
- `returnUrl` solo se acepta si empieza por `/`, no por `//`, y `Router.parseUrl` lo resuelve a una ruta interna. Si no, se usa `/catalogo`.
- Avisos en login por `?aviso=`: `registro`, `clave` (contraseña cambiada) y `sesion` (sesión expirada). Cualquier otro valor se ignora.
- Política de contraseña replicada en el cliente: mínimo 10 caracteres, máximo 72 bytes, con mayúscula, minúscula y número, y sin contener el email. `documento`: `^[A-Za-z0-9-]{5,20}$`. `nombre`: 2 a 120 caracteres. El backend sigue siendo la autoridad. El login solo exige que los campos no estén vacíos.
- Errores mostrados con `app-alert`: `401` en login → "Credenciales inválidas"; `403` → el `message` del backend; `409` en registro → "Ese email ya está registrado"; `429` → "Demasiados intentos, espera un minuto"; sin respuesta (`status 0`) → "No se pudo conectar con el servidor".

## Plan de implementación

Cada paso deja la app compilando y navegable. Antes de crear cualquier componente `app-*` se invoca la skill `ui-component`; el diseño visual sigue `frontend-design` y `web-design-guidelines`.

1. **Conexión con el backend.** Crear `proxy.conf.json` (`/api` → `http://localhost:3000`, `pathRewrite` `^/api` → vacío, `changeOrigin`), registrarlo en `angular.json` (`serve.options.proxyConfig`) y crear `src/app/core/http/api-config.ts` con el `InjectionToken` `API_BASE_URL` (por defecto `/api`). Leer el formato real del cuerpo de error del backend y fijar `api-error.ts`. Verificar con el backend levantado: `GET /api/catalog/products` desde `localhost:4200` responde.
2. **Tipos y `SessionService`.** Crear `core/auth/auth.types.ts` y `core/auth/session.ts` (`@Service`; signals `status`, `user`; `computed` `role` y `isAuthenticated`; access token en memoria; refresh token en `localStorage` con `try/catch`). Mover `AppRole` aquí y renombrar `DemoRole` a `SessionRole`. Test Vitest.
3. **`AuthApi`.** Crear `core/auth/auth-api.ts` con login, registro, refresh, logout, perfil y cambio de contraseña sobre `HttpClient`, y la función que convierte `HttpErrorResponse` en `ApiError`. Test con `HttpTestingController`.
4. **Interceptor y arranque.** Crear `core/auth/auth.interceptor.ts` (Bearer solo hacia `API_BASE_URL`, excepto `/auth/login`, `/auth/register` y `/auth/refresh`; ante `401` un único refresh compartido y un reintento; si falla, borra la sesión y manda a `/auth/login?returnUrl=…&aviso=sesion`). El refresh usa `navigator.locks` y relee el refresh token del almacenamiento dentro del bloqueo, para que dos pestañas no reutilicen un token ya rotado. Registrar `provideHttpClient(withInterceptors(...))` y `provideAppInitializer` que restaura la sesión (solo borra el refresh token si el backend responde `400`, `401` o `403`; un error de red deja la sesión anónima y conserva el token). Tests de los casos: sin token, `401` con refresh correcto, `401` con refresh fallido, varias peticiones simultáneas con un solo refresh.
5. **Guard y acceso denegado.** Crear `core/auth/access.guard.ts` (`canActivateChild`, según la semántica de `RouteInfo.roles`), `core/auth/safe-return-url.ts` y `core/routing/forbidden.ts` (`/acceso-denegado` con `app-empty-state`). Aplicar el guard en la ruta layout y en la ruta `auth`. Tests de cada caso de la semántica y de `returnUrl` hostil (`//evil.com`, `https://…`, `javascript:`).
6. **Navegación y header.** Eliminar `DemoRoleService` y su spec. `NavigationService` filtra con `SessionService.role`. Quitar el selector de rol de `AppHeader`; añadir el botón **Iniciar sesión** (visitante) y el menú de usuario con **Mi cuenta** y **Cerrar sesión** (autenticado). Añadir el ítem de `/cuenta` en `NAV_ITEMS` para los tres roles. Borrar `agro:demo-role` al arrancar. Actualizar `navigation.spec.ts`.
7. **Componentes de formulario.** Con la skill `ui-component`: `app-input` (texto, email, contraseña con botón mostrar/ocultar con `ariaLabel`), `app-select`, `app-checkbox` (los tres con etiqueta, ayuda y error accesibles, integrados con Signal Forms mediante los contratos de control de `@angular/forms/signals`) y `app-alert` (`danger`, `info`, `success`; `role="alert"` en `danger`). Cada uno con `.types.ts`, spec y demo `/ui/<nombre>`. Solo `app-input`, `app-select` y `app-checkbox` importan Material.
8. **Layout de auth y login.** Crear `core/layout/auth-layout.ts` y sacar `app-shell` de `App` para que sea el componente de una ruta layout (`App` pasa a montar solo `<router-outlet />`). Crear `features/auth/login/login.ts` con Signal Form, estado de envío, errores, avisos por `?aviso=` y redirección a `returnUrl` o `/catalogo`. Sustituir el `loadComponent` de `/auth/login` conservando `title` y `data`.
9. **Registro.** Crear `features/auth/registro/registro.ts` con los seis campos y la validación del cliente. Éxito de `PRODUCTOR` → `/auth/login?aviso=registro`. Éxito de `PROVEEDOR` → pantalla en la misma ruta que explica que la solicitud queda pendiente de aprobación. Sustituir el `loadComponent` de `/auth/registro`.
10. **Cuenta.** Crear `features/cuenta/cuenta.ts`: perfil desde `GET /auth/me` (nombre, email, rol, estado y tienda si existe), formulario de cambio de contraseña y botón **Cerrar sesión**. Tras cambiar la contraseña se borra la sesión local y se va a `/auth/login?aviso=clave`. Cerrar sesión llama a `POST /auth/logout` y borra la sesión local aunque la llamada falle. Sustituir el `loadComponent` de `/cuenta`.
11. **Cierre.** Actualizar `route-map.spec.ts` (los roles usan `SessionRole`) y `CLAUDE.md` (sección de estructura: `core/auth`, `core/http`, sin rol de demo, login fuera del shell; claves de `localStorage`; proxy). Recorrido manual completo contra el backend y revisión AXE.

## Criterios de aceptación

- [x] `ng serve` arranca con el proxy y `GET http://localhost:4200/api/catalog/products` devuelve la respuesta del backend.
- [x] `localhost:4200/` sin sesión redirige a `/catalogo` y el header muestra el botón **Iniciar sesión**.
- [x] Un visitante puede abrir `/catalogo`, `/catalogo/ofertas` y `/catalogo/tiendas`, y ve en el panel solo Explorar y Cuenta (iniciar sesión, registrarse).
- [x] Un visitante que abre `/carrito`, `/cuenta` o `/admin/usuarios` termina en `/auth/login?returnUrl=<ruta>`.
- [x] Con credenciales válidas, el login guarda la sesión y navega a `returnUrl`, o a `/catalogo` si no hay.
- [x] Tras iniciar sesión el header muestra el menú de usuario con nombre y el panel muestra los ítems del rol real (PRODUCTOR: Explorar, Compras, Cuenta; PROVEEDOR: Explorar, Mi tienda, Cuenta; ADMIN: Explorar, Administración, Cuenta).
- [x] Un `PRODUCTOR` que abre `/admin/usuarios` o `/proveedor/productos` ve `/acceso-denegado`.
- [x] Un usuario con sesión que abre `/auth/login` o `/auth/registro` es redirigido a `/catalogo`.
- [x] Credenciales incorrectas muestran "Credenciales inválidas" en un `app-alert` y no navegan.
- [x] Un `PROVEEDOR` pendiente, rechazado o deshabilitado ve el mensaje `403` del backend.
- [x] Una respuesta `429` muestra "Demasiados intentos, espera un minuto" y el botón de envío no queda bloqueado para siempre.
- [x] Con el backend apagado, el login muestra "No se pudo conectar con el servidor".
- [x] `returnUrl=//evil.com`, `returnUrl=https://evil.com` y `returnUrl=javascript:alert(1)` navegan a `/catalogo`.
- [x] Recargar la página con sesión iniciada la conserva sin volver a pasar por login, y la ruta privada abierta se mantiene.
- [x] Con el refresh token borrado, caducado o inválido, recargar deja al usuario como visitante y limpia `agro:refresh-token`.
- [x] Con el backend apagado, recargar deja al usuario como visitante pero conserva `agro:refresh-token`; al volver el backend, una nueva recarga restaura la sesión.
- [x] Ante un `401` por access token vencido, el interceptor hace un único `POST /auth/refresh` aunque haya varias peticiones simultáneas, y reintenta todas con el token nuevo.
- [x] Si el refresh falla durante una petición, se borra la sesión y se navega a `/auth/login?aviso=sesion`, con el aviso visible.
- [x] Abrir dos pestañas a la vez con sesión iniciada y recargarlas no cierra la sesión (el refresh token no se reutiliza).
- [x] Ninguna petición a `/auth/login`, `/auth/register` ni `/auth/refresh` lleva cabecera `Authorization`, y las peticiones a otros orígenes no la llevan nunca.
- [x] El access token no aparece en `localStorage`, `sessionStorage` ni en la consola.
- [x] `/auth/login` y `/auth/registro` se muestran sin header ni panel, y el resto de rutas siguen dentro del shell.
- [x] El registro valida en el cliente email, contraseña (política completa), nombre, documento, rol y consentimiento, y no envía el formulario si algo falla.
- [x] Registrar un `PRODUCTOR` navega a `/auth/login?aviso=registro` y muestra el aviso.
- [x] Registrar un `PROVEEDOR` muestra la pantalla de solicitud pendiente y ese usuario no puede iniciar sesión.
- [x] Registrar un email repetido muestra "Ese email ya está registrado".
- [x] `/cuenta` muestra nombre, email, rol y estado del usuario (y la tienda si es proveedor con tienda).
- [x] Cambiar la contraseña con datos válidos borra la sesión local y navega a `/auth/login?aviso=clave`; con la contraseña actual incorrecta muestra el error y conserva la sesión.
- [x] **Cerrar sesión** envía `POST /auth/logout`, borra el refresh token y deja al usuario como visitante, incluso si la llamada falla.
- [x] No queda en `src/` ninguna referencia a `DemoRole`, `DemoRoleService` ni `agro:demo-role`, salvo el borrado de la clave heredada al arrancar.
- [x] `app-input`, `app-select`, `app-checkbox` y `app-alert` tienen demo funcional en ambos temas y no exponen tipos de Material ni de CDK.
- [x] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [x] Login, registro y cuenta no tienen violaciones AXE en claro ni en oscuro, los errores se anuncian a lectores de pantalla y todo se maneja con teclado.
- [x] A 360, 768 y 1280 px no hay scroll horizontal de página en login, registro y cuenta.
- [x] `ng test` pasa y `npm run build` termina sin errores.

## Decisiones tomadas y descartadas

- **Sí:** el visitante navega el catálogo sin iniciar sesión y `/` redirige siempre a `/catalogo`. Las reglas de negocio dicen que consultar productos, tiendas, ofertas y categorías es público. El login es opcional y solo protege lo privado. (El enunciado inicial hablaba de "ver si hay sesión para decidir a qué página rutear"; se aclaró que el visitante ve lo suyo con un botón de iniciar sesión.)
- **No:** mandar `/` a `/auth/login` sin sesión. Ocultaría el catálogo público.
- **Sí:** access token en memoria y refresh token en `localStorage`. El backend no usa cookies, así que `httpOnly` no es posible. Mantener el access token fuera del disco reduce lo que roba un XSS.
- **No:** ambos tokens en `localStorage`. Más simple, pero deja expuesto el token con permisos.
- **No:** `sessionStorage`. La sesión moriría al cerrar la pestaña y el productor tendría que iniciar sesión a diario.
- **Sí, riesgo aceptado:** el refresh token en `localStorage` es legible por JavaScript. Se asume por el diseño del backend y se mitiga en parte con la rotación y la detección de reuso; una CSP queda para otra spec.
- **Sí:** restaurar la sesión antes de la primera navegación (`provideAppInitializer`). Sin eso los guards decidirían con un estado "desconocido" y mandarían a login a usuarios que sí tienen sesión.
- **Sí:** usar `navigator.locks` en el refresh y releer el token dentro del bloqueo. El refresh rota y el reuso revoca toda la sesión; sin esto, dos pestañas recargadas a la vez cerrarían la sesión por error.
- **Sí:** el refresh solo borra el token ante `400`, `401` o `403`. Un backend caído no debe desloguear a nadie.
- **Sí:** renovación reactiva ante `401`, no proactiva. Menos código y el backend ya fija el vencimiento; la proactiva puede añadirse después.
- **Sí:** un único `accessGuard` que lee `RouteInfo.roles`, que ya existe en cada ruta por la SPEC 02. Evita guards por dominio y mantiene el mapa de rutas como única fuente de permisos.
- **Sí:** `/acceso-denegado` como página propia. Redirigir en silencio al catálogo esconde el motivo.
- **Sí:** `returnUrl` validado (ruta interna). Un `returnUrl` libre es un open redirect.
- **Sí:** `?aviso=` con valores cerrados para los mensajes de login. Evita pasar texto arbitrario por la URL.
- **Sí:** proxy de `ng serve` con `API_BASE_URL = '/api'`. Sin CORS en desarrollo y el mismo patrón sirve en producción tras un proxy inverso.
- **No:** URL absoluta `http://localhost:3000`. Obliga a configurar `CORS_ORIGINS` en el backend y fija una URL en el código.
- **Sí:** el registro de `PRODUCTOR` no inicia sesión automáticamente. El backend no devuelve tokens al registrar y se evita encadenar dos llamadas.
- **Sí:** al cambiar la contraseña se borra la sesión local. El backend ya cerró todas las sesiones y los tokens dejan de servir.
- **Sí:** cerrar sesión borra el estado local aunque `POST /auth/logout` falle. La intención del usuario manda y el refresh token expira solo.
- **Sí:** login y registro fuera del shell, con `AuthLayout`. Cambia lo decidido en la SPEC 02 ("el shell envuelve también login y registro") a petición del usuario.
- **Sí:** eliminar el selector de rol de demo y `DemoRoleService`. Dos fuentes de verdad para el rol serían un riesgo de seguridad visual y de confusión.
- **Sí:** crear `app-input`, `app-select`, `app-checkbox` y `app-alert` en esta spec. Las pantallas de auth los exigen y la SPEC 02 dejó claro que se crean con la skill cuando una pantalla los pide. `app-alert` no estaba en la lista original; se añade porque los errores y avisos de login lo necesitan y evita marcado ad hoc en la feature.
- **Sí:** validación de la política de contraseña en el cliente como ayuda de UX. El backend manda; el cliente no la sustituye.
- **No:** dividir en dos specs. El usuario eligió mantener login, registro, cuenta, interceptor y guards juntos; el riesgo de tamaño se gestiona con pasos pequeños que dejan la app funcional.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La spec es grande (sesión, HTTP, guards, 4 componentes y 3 pantallas) | 11 pasos commitables por separado; el paso 7 (componentes) y los pasos 8 a 10 (pantallas) se pueden partir en commits por componente y por pantalla. |
| Dos pestañas reutilizan un refresh token y el backend revoca la sesión | `navigator.locks` más relectura del token dentro del bloqueo. Criterio de aceptación específico. |
| `navigator.locks` no existe en el navegador o en jsdom | Si no está disponible, se ejecuta el refresh sin bloqueo (degradación aceptada) y los tests lo cubren con un doble. |
| El formato real del error del backend no coincide con `message` | El paso 1 lo verifica contra el backend antes de escribir `api-error.ts`. |
| El throttle de 5 intentos por minuto y por IP bloquea al usuario en desarrollo | Se muestra el mensaje `429` y se documenta la espera. Tras el proxy todos los clientes comparten IP, es esperable en local. |
| El backend no está levantado al probar | El criterio de red caída define el comportamiento esperado; el recorrido manual del paso 11 exige el backend corriendo. |
| `canActivateChild` en rutas lazy anidadas se ejecuta en niveles sin `data.roles` | El guard ignora las rutas sin `data.roles`; hay test con una ruta intermedia. |
| Sacar `app-shell` de `App` rompe `app.spec.ts`, `app-shell.spec.ts` y los specs de rutas | Se actualizan en el paso 8 junto con el cambio, y `ng test` debe pasar al final de cada paso. |
| Los contratos de control de Signal Forms cambian entre versiones de Angular | Se consulta la documentación con `search_documentation` del MCP de Angular antes del paso 7. |
| Un token con permisos queda en `localStorage` ante un XSS | Riesgo aceptado y documentado; ningún HTML se inyecta con `innerHTML` y se deja CSP para otra spec. |

## Lo que **no** está en esta spec

- Maquetar el resto de pantallas con datos mock (SPEC 04).
- Administración de usuarios: aprobar o rechazar proveedores, deshabilitar y cambiar roles.
- Recuperar contraseña, verificar email, 2FA y login social.
- Renovación proactiva del token y sincronización de sesión entre pestañas.
- CSP, endurecimiento de cabeceras y configuración de producción del proxy.
- Internacionalización y tests e2e.

## Verificación del cierre (2026-11-08)

**Automática:** `ng test` 33 archivos / 396 tests en verde, `npm run build` sin errores ni avisos, y `grep` de `@angular/(material|cdk)` fuera de `src/app/shared/ui/` vacío.

**En el navegador contra el backend real** (`ng serve` con proxy + `agro-app-workspace`): proxy del catálogo, redirección de visitante con `returnUrl`, registro de `PRODUCTOR` y de `PROVEEDOR`, email repetido (`409`), login correcto e incorrecto, `403` del proveedor pendiente, `429` con el botón de nuevo activo, panel y menú del rol real, `/acceso-denegado`, invitado con sesión a `/catalogo`, recarga con sesión, refresh token inválido (se limpia), dos pestañas recargadas, cambio de contraseña (actual incorrecta y correcta), cierre de sesión.

**AXE (axe-core 4.10.2) en claro y oscuro:** login (con aviso, con errores de validación y con error `401`), registro (vacío, con errores y con la lista abierta) y `/cuenta`, sin violaciones. Contraste comprobado además con un cálculo propio sobre todo el texto visible. Sin scroll horizontal a 360, 768 y 1280 px en los tres.

**Solo con tests, no en vivo:** `401` por access token vencido con un único refresh compartido (`auth.interceptor.spec.ts`), restauración con el backend apagado conservando el refresh token (`session-refresher.spec.ts`), los paneles de `PROVEEDOR` y `ADMIN`, y el aviso `?aviso=sesion` tras un refresh fallido.

**Hallazgos durante la verificación:** `aria-labelledby` sobre `app-card` sin rol en `/cuenta` (corregido con `role="region"`); un `502` del proxy con el backend apagado se mostraba como error genérico (ahora `toApiError` lo trata como sin conexión); un cuerpo HTML de error se mostraba tal cual (ahora se ignora). Las comprobaciones de contraste inmediatas tras cambiar de tema dan falsos positivos por `transition-colors`: hay que esperar unos 2 s.
