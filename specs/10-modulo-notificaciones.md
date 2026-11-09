# SPEC 10 — Módulo Notificaciones: campana, bandeja, avisos emergentes y marcado como leído

> **Status:** Implementado
> **Depends on:** SPEC 03, SPEC 04, SPEC 06, SPEC 07, SPEC 09
> **Date:** 2026-11-09
> **Objective:** Conectar el frontend a la bandeja de avisos del backend con una campana en el header (contador de no leídos y panel con los últimos avisos), una página `/notificaciones` con el historial, el marcado como leído y un aviso emergente cuando llega uno nuevo, para el `PRODUCTOR` y el `PROVEEDOR`.

---

## Por qué existe esta spec

El backend (`agro-app-workspace`, specs 09, 10 y 11) ya genera los avisos a partir de los eventos de cuentas, pagos y pedidos, los guarda en el servicio `notifications` y los expone en `api` con cuatro rutas. Hasta hoy el frontend no los muestra: un productor no se entera de que su pago fue aprobado ni un proveedor de que tiene un pedido nuevo si no entra a mirar.

Contrato del backend que esta spec consume (leído el 2026-11-09 en `specs/11-notifications-lectura-de-avisos.md`, `apps/api/src/modules/notification-inbox/controllers/notifications.controller.ts`, `…/dto/notifications.dto.ts` y `apps/notifications/src/templates/`):

- **Rutas** (todas privadas, solo `PRODUCTOR` y `PROVEEDOR`; el `ADMIN` recibe `403`):
  - `GET /notifications?limit&cursor` → `{ data: NotificationView[], nextCursor: string | null }`, del más nuevo al más viejo. `limit` de 1 a 50 (por defecto 20); `cursor` es el `id` del último aviso de la página anterior. Cualquier otra propiedad da `400`.
  - `GET /notifications/unread-count` → `{ count }`.
  - `PATCH /notifications/:id/read` → `NotificationView`. Idempotente (no mueve `readAt`); un `id` ajeno o inexistente da `404`.
  - `POST /notifications/read-all` → `{ updated }`; la segunda llamada devuelve `0`.
- **Paginación por cursor**, no `page/total` como el resto de módulos. No hay `total`: el fin de la lista es `nextCursor = null`.
- **Sin push.** El backend deja fuera WebSocket y SSE y dice que el frontend sondea cada 30 a 60 s. Límites por IP: lecturas 60/min y escrituras 30/min.
- **Fallos.** Si el servicio `notifications` está caído, lento (más de 3 s) o mal configurado, las rutas de avisos responden `503` y el resto de `api` sigue funcionando.
- **Visibilidad.** El `PRODUCTOR` ve sus avisos de usuario. El `PROVEEDOR` ve los suyos y, si el token trae `storeId`, los de su tienda. El backend arma el actor desde el token: el frontend nunca envía `userId` ni `storeId`.
- **El texto ya viene en español** (`titulo`, `mensaje`). Los mensajes de pago y pedido incluyen el id del pedido (24 hex) dentro del texto.
- **Plantillas** (`plantilla`): `USER_REGISTERED`, `PROVIDER_APPROVED`, `PROVIDER_REJECTED`, `PAYMENT_APPROVED`, `PAYMENT_DECLINED`, `ORDER_CONFIRMED_BUYER`, `ORDER_CONFIRMED_STORE` y `ORDER_CANCELLED`. `orderId` solo viene en las de pago y pedido.

## Alcance

**Dentro:**

- **Módulo `core/notifications/`** (lo usan el header y una feature): tipos, `NotificationsApi`, `NotificationsService` (estado con señales y sondeo), utilidades de presentación y enlace, y los componentes `notification-bell` y `notification-item`.
- **Campana en el header** (`app-header`) solo para `PRODUCTOR` y `PROVEEDOR`: icono con insignia de no leídos y, al pulsarla, un panel con los últimos 10 avisos, el botón **Marcar todas como leídas** y el enlace **Ver todas** a `/notificaciones`.
- **Sondeo del contador** (`GET /notifications/unread-count`) cada 45 s, pausado con la pestaña oculta, refrescado al volver a ella y con espera creciente ante `429` o `503`.
- **Página `/notificaciones`** (`features/notificaciones/`): historial con **Cargar más** por cursor, filtro **Todas / No leídas** en la URL y **Marcar todas como leídas**.
- **Clic en un aviso:** marca el aviso como leído y, si trae `orderId`, navega al detalle del pedido según el rol (`PRODUCTOR` a `/pedidos/:orderId`; `PROVEEDOR` a `/proveedor/pedidos/:subId`: el detalle usa el id del sub-pedido y el aviso solo trae el del pedido, así que se busca el sub-pedido con ese `orderId` en `GET /orders/provider/sub-orders` y, si no aparece, va a la lista `/proveedor/pedidos`). Los avisos de cuenta solo se marcan.
- **Icono y tono por plantilla** (mapa plantilla → icono y color con los tokens del tema).
- **Aviso emergente (toast)** cuando el contador sube: muestra el título y el mensaje de los avisos nuevos, hasta 3 a la vez.
- **Componentes UI nuevos**, creados con la skill `ui-component` y con demo en `/ui/<nombre>`: `app-popover` (panel anclado a un botón, con foco y Esc) y `app-toast` (con su servicio). Más el icono `bell` en `app-icon`.
- Ruta `/notificaciones` con `title` y `data: RouteInfo`, e ítem **Notificaciones** en `NAV_ITEMS` para los dos roles.
- Actualizar `CLAUDE.md`.

**Fuera de alcance (otras specs):**

- Push, WebSocket o SSE y cualquier canal real (email, SMS, notificaciones del navegador o del sistema operativo).
- Preferencias de notificación, silenciar tipos de aviso, borrar o archivar avisos.
- Avisos para el `ADMIN` (el backend responde `403`) y campana en rutas fuera del shell (`/auth/*`).
- Enlaces propios para avisos sin pedido (por ejemplo ir a `/proveedor/tienda` desde `PROVIDER_APPROVED`): solo se marcan como leídos.
- Filtrar por estado de lectura en el servidor (el backend no lo ofrece) y búsqueda dentro de los avisos.
- Sincronizar el estado entre pestañas (cada pestaña sondea por su cuenta).
- Renovar la sesión del proveedor al crear su tienda para que el token traiga `storeId` (ver riesgos).
- Persistir avisos o el estado del panel en `localStorage`.
- Cambios en el backend.
- Tests e2e e internacionalización.

## Modelo de datos

```ts
// src/app/core/notifications/models/notifications.types.ts (espejo de NotificationView del backend)
export type NotificationTemplate =
  | 'USER_REGISTERED'
  | 'PROVIDER_APPROVED'
  | 'PROVIDER_REJECTED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_DECLINED'
  | 'ORDER_CONFIRMED_BUYER'
  | 'ORDER_CONFIRMED_STORE'
  | 'ORDER_CANCELLED';

export interface AppNotification {
  id: string;
  plantilla: NotificationTemplate;
  destinatarioTipo: 'USER' | 'STORE';
  titulo: string;
  mensaje: string;
  orderId: string | null; // solo en avisos de pago y pedido
  sentAt: string; // ISO
  readAt: string | null; // ISO; null = sin leer
}

export interface NotificationsPage {
  data: AppNotification[];
  nextCursor: string | null; // null en la última página
}

export type NotificationsFilter = 'todas' | 'no-leidas'; // `?filtro=no-leidas` en la URL

export const NOTIFICATIONS_POLL_INTERVAL_MS = 45_000;
export const NOTIFICATIONS_POLL_MAX_INTERVAL_MS = 300_000; // tope de la espera creciente
export const NOTIFICATIONS_PANEL_SIZE = 10; // avisos en el panel de la campana
export const NOTIFICATIONS_PAGE_SIZE = 20; // avisos por página en /notificaciones
export const NOTIFICATIONS_TOAST_MAX = 3; // toasts simultáneos
export const NOTIFICATIONS_TOAST_DURATION_MS = 6_000;
```

Estado de `NotificationsService` (señales, nada se guarda entre sesiones):

| Señal | Contenido |
| --- | --- |
| `unreadCount` | Número de avisos sin leer; `0` mientras no haya respuesta. |
| `polling` | `true` si hay sondeo activo (rol `PRODUCTOR` o `PROVEEDOR` con sesión). |
| `degraded` | `true` tras un fallo del último sondeo; la campana no muestra insignia y el panel avisa. |

Presentación por plantilla (función pura en `utils/notification-presentation.ts`, con test que cubre las ocho plantillas):

| Plantilla | Icono | Tono |
| --- | --- | --- |
| `PAYMENT_APPROVED` | `credit-card` | `brand` |
| `PAYMENT_DECLINED` | `credit-card` | `danger` |
| `ORDER_CONFIRMED_BUYER` | `receipt` | `brand` |
| `ORDER_CONFIRMED_STORE` | `store` | `brand` |
| `ORDER_CANCELLED` | `receipt` | `warning` |
| `PROVIDER_APPROVED` | `check` | `brand` |
| `PROVIDER_REJECTED` | `alert` | `danger` |
| `USER_REGISTERED` | `user` | `info` |

Enlace de un aviso (`utils/notification-link.ts`, función pura con test): sin `orderId` o con un valor que no sea 24 hex devuelve `null`; con `orderId` válido, `/pedidos/:orderId` para `PRODUCTOR` y `/proveedor/pedidos` (la lista) para `PROVEEDOR`. Para cualquier otro rol devuelve `null`.

Estructura de carpetas (SPEC 04; solo las que tienen contenido):

```text
src/app/shared/ui/popover/        # app-popover: popover.ts, popover.types.ts, popover.spec.ts, popover-demo.ts
src/app/shared/ui/toast/          # app-toast + ToastService: toast.ts, toast.types.ts, toast.spec.ts, toast-demo.ts
src/app/shared/ui/icon/           # + 'bell' en icon-paths.ts

src/app/core/notifications/
  index.ts                        # NotificationBell, NotificationItem, NotificationsService, tipos y utilidades públicas
  models/notifications.types.ts
  services/notifications-api.ts   # list, unreadCount, markRead, markAllRead
  services/notifications.ts       # estado (señales) + sondeo + disparo de toasts
  utils/notification-presentation.ts
  utils/notification-link.ts
  utils/poll-interval.ts          # espera creciente ante 429 o 503
  components/notification-bell/   # botón con insignia + app-popover con la lista corta
  components/notification-item/   # fila de un aviso (icono, título, mensaje, fecha, punto de no leído)

src/app/features/notificaciones/
  index.ts                        # solo NOTIFICACIONES_ROUTES
  notificaciones.routes.ts
  utils/filter-params.ts          # `?filtro=` <-> NotificationsFilter validado
  pages/notificaciones/
```

Convenciones:

- Las fechas se muestran con `Intl.DateTimeFormat('es-CO')` (fecha y hora); no se calculan tiempos relativos.
- La insignia muestra el número hasta 99 y `99+` por encima. El `aria-label` de la campana dice "Notificaciones, N sin leer" (o solo "Notificaciones" con cero), y el cambio del contador se anuncia en una región `aria-live="polite"` oculta visualmente.
- El estado de un aviso no se indica solo con color: el no leído lleva un punto con texto oculto "Sin leer" y el título en negrita.
- `mensaje` puede contener un id de 24 caracteres sin espacios: se renderiza con `break-words` para no producir scroll horizontal a 360 px.
- `titulo` y `mensaje` se muestran como texto (interpolación de Angular), nunca como HTML.
- Tras `PATCH …/read` la fila usa la respuesta del backend y el contador baja en uno (sin bajar de 0) hasta que el siguiente sondeo lo reconcilia. Tras `POST …/read-all` se vuelve a pedir el contador y la primera página.
- Mientras una acción está en curso su botón queda deshabilitado y no se permite un segundo envío. Un clic en un aviso ya leído no llama al backend y solo navega.
- `NotificationsService` arranca el sondeo desde `AppShell` y lo detiene al cerrar sesión, al cambiar a un rol sin avisos y al destruirse; no arranca en `/auth/*` ni para `ADMIN` o visitantes.
- El sondeo consulta solo el contador. La lista se pide al abrir el panel, al abrir `/notificaciones` y al reconciliar tras una acción.
- Un `429` o `503` en el sondeo duplica la espera hasta `NOTIFICATIONS_POLL_MAX_INTERVAL_MS` y marca `degraded`; la primera respuesta correcta vuelve a los 45 s. Un `401` lo maneja `authInterceptor`.
- Con la pestaña oculta (`document.visibilityState === 'hidden'`) no se hace ninguna petición; al volver a ser visible se consulta de inmediato.
- Toasts: se emiten cuando `unreadCount` sube respecto al valor anterior ya conocido. El servicio guarda el `id` del aviso más reciente que ya vio (se siembra con `GET /notifications?limit=1` en el primer sondeo, sin mostrar toast) y, al subir el contador, pide `GET /notifications?limit=5` y muestra un toast por cada aviso sin leer con `id` mayor, hasta `NOTIFICATIONS_TOAST_MAX`; si hay más, un último toast "y N avisos más" con enlace a `/notificaciones`. No se muestran toasts por avisos que ya estaban al iniciar sesión.
- `app-toast`: `role="status"` y `aria-live="polite"` (`role="alert"` solo para tono `danger`), se cierra solo a los 6 s, el temporizador se pausa con el puntero encima o con el foco dentro, tiene botón de cerrar con `ariaLabel` y no roba el foco. Con `prefers-reduced-motion` no anima.
- `app-popover`: abre con clic o Enter y cierra con Esc o clic fuera, devuelve el foco al botón que lo abrió, usa `aria-expanded` y `aria-controls` en el disparador y no atrapa el foco (no es modal). A 360 px su ancho es `min(24rem, 100vw - 2rem)` y no genera scroll horizontal de página.
- Estados del panel y de la página con `app-resource-state`: cargando, error con **Reintentar** (`503`: "El servicio de notificaciones no está disponible"; `429`: "Demasiados intentos, espera un minuto"; sin conexión: "No se pudo conectar con el servidor") y vacío ("No tienes notificaciones").
- Filtro `?filtro=`: solo acepta `no-leidas`; cualquier otro valor se trata como `todas`. Es un filtro en el cliente sobre los avisos ya cargados; si con **No leídas** activo no hay ninguno visible pero quedan páginas, se muestra "No hay avisos sin leer en lo cargado" con **Cargar más**.
- Dirección de dependencias (se añade a la SPEC 04): `http` ← `auth` ← `notifications`, con `shared/ui` usable por `notifications`; `notifications` nunca importa de `navigation`, `routing`, `layout`, `cart` ni de otra feature. `layout` y `features/notificaciones` pueden usar `core/notifications`.

## Plan de implementación

Cada paso deja la app compilando, con `ng test` en verde y `ng build` sin errores. Antes de crear cualquier `app-*` o ampliar uno existente se invoca la skill `ui-component`; el diseño visual sigue `frontend-design` y `web-design-guidelines`.

1. **Contrato y línea base.** Con `api` y `notifications` levantados y un `PRODUCTOR` y un `PROVEEDOR`, verificar con `curl` o el navegador: la forma real de las cuatro rutas, el `404` de un id ajeno, el `403` del `ADMIN`, el `503` con `notifications` apagado, que un cursor inválido da `400`, y **si `:id` del detalle de un pedido recibido del proveedor (`/proveedor/pedidos/:id`) es el id del pedido o el de un sub-pedido** (de eso depende el enlace del `PROVEEDOR`; si es otro, se ajusta `notification-link` y esta spec). Comprobar también si el token de un proveedor recién aprobado trae `storeId` antes de renovar la sesión. Ajustar "Modelo de datos" si algo difiere. Anotar el número de tests de `ng test` y los chunks lazy de `ng build`.
2. **Icono y `app-popover`.** Con la skill `ui-component`: añadir `bell` a `icon-paths.ts` y crear `app-popover` (disparador proyectado, contenido proyectado, `open` como `model`, `ariaLabel`, alineación `start` o `end`, Esc, clic fuera, foco devuelto, `aria-expanded` y `aria-controls`). Solo `shared/ui/popover` importa CDK. Spec y demo `/ui/popover` (ruta nueva en `app.routes.ts`).
3. **`app-toast` y `ToastService`.** Con la skill `ui-component`: contenedor accesible (`aria-live`), `ToastService.show({ title, message?, tone, link? })` y `dismiss`, temporizador con pausa por hover y foco, límite de simultáneos y reducción de movimiento. Montar el contenedor una sola vez en `App` o en `AppShell` (definirlo aquí y anotarlo en `CLAUDE.md`). Spec y demo `/ui/toast` (ruta nueva).
4. **Tipos, `NotificationsApi` y utilidades.** Crear `models/`, `services/notifications-api.ts` (solo se envían `limit` y `cursor` con valor; errores como `ApiError`), `utils/notification-presentation.ts`, `utils/notification-link.ts` y `utils/poll-interval.ts`. Specs: `NotificationsApi` con `HttpTestingController` (URLs, métodos, query y que nunca se envía `userId` ni `storeId`), las ocho plantillas, el enlace por rol y por `orderId` inválido, y la espera creciente con su tope.
5. **`NotificationsService`: estado y sondeo.** Crear `services/notifications.ts` con `unreadCount`, `polling`, `degraded`, `start`/`stop`, sondeo de 45 s, pausa con la pestaña oculta, refresco al volver, espera creciente y reinicio al cerrar sesión. Specs con temporizadores simulados: intervalo base, pausa y reanudación, `429` y `503` duplican la espera y vuelven al base tras un éxito, no hay peticiones sin sesión ni con `ADMIN`, y `stop` limpia el temporizador.
6. **`notification-item` y campana en el header.** Crear `components/notification-item/` y `components/notification-bell/` (insignia, región `aria-live`, panel con los últimos 10, estados, **Marcar todas como leídas**, **Ver todas**). Añadir la campana a `app-header` solo para `PRODUCTOR` y `PROVEEDOR` y arrancar el sondeo desde `AppShell`. Specs: insignia con 0, 5 y 100 (`99+`), el clic marca leído y navega por rol, el aviso de cuenta solo se marca, el ya leído no llama al backend y el `ADMIN` y el visitante no ven la campana.
7. **Página `/notificaciones`.** Crear `features/notificaciones/` con `notificaciones.routes.ts` (ruta con `title` y `data: RouteInfo` con `roles` `['PRODUCTOR', 'PROVEEDOR']`), `utils/filter-params.ts` y `pages/notificaciones/` (lista con **Cargar más**, filtro **Todas / No leídas** en la URL, **Marcar todas como leídas**, estados). Montarla en `app.routes.ts` con `loadChildren`, añadir el ítem **Notificaciones** a `NAV_ITEMS` y comprobar que `route-map.spec.ts` sigue en verde. Specs: carga por cursor sin repetir avisos, `nextCursor = null` oculta **Cargar más**, filtro inválido cae en `todas` y el mensaje de "No hay avisos sin leer en lo cargado".
8. **Toasts de avisos nuevos.** Conectar `NotificationsService` con `ToastService`: siembra del `id` más reciente sin toast, toast por cada aviso nuevo sin leer al subir el contador, límite de 3 más el resumen "y N avisos más". Specs: no hay toast al iniciar sesión con avisos previos, hay uno por cada aviso nuevo, no se repiten, el resumen aparece con más de 3 y no se emite nada si el contador baja.
9. **Cierre.** Actualizar `CLAUDE.md` (árbol con `core/notifications`, `features/notificaciones`, `app-popover`, `app-toast`, dirección de dependencias, claves de estado y que no se persiste nada). Recorrido manual completo contra el backend con un checkout de dos tiendas pagado, y revisión AXE de la campana, el panel, la página y los toasts en claro y oscuro.

## Criterios de aceptación

- [ ] Un `PRODUCTOR` y un `PROVEEDOR` con sesión ven la campana en el header en todas las rutas del shell; un visitante y un `ADMIN` no la ven, y en `/auth/*` no aparece.
- [ ] La campana muestra el número de avisos sin leer (`99+` por encima de 99), nada con cero, y su `aria-label` dice "Notificaciones, N sin leer".
- [ ] Tras un pago aprobado, el contador del productor sube sin recargar en un máximo de 45 s (más el tiempo de entrega del backend) y aparece un toast con el título del aviso.
- [ ] Un pedido confirmado con dos tiendas deja un aviso al productor y uno a cada proveedor, visibles en la campana y en `/notificaciones` de cada uno.
- [ ] Abrir el panel pide los últimos 10 avisos, los muestra del más nuevo al más viejo con icono, título, mensaje y fecha, y distingue los no leídos con un punto con texto "Sin leer" y título en negrita.
- [ ] Pulsar un aviso sin leer con `orderId` envía `PATCH /notifications/:id/read` y navega a `/pedidos/:orderId` (productor) o al detalle del sub-pedido en `/proveedor/pedidos/:subId` (proveedor, o la lista si no se encuentra); el contador baja en uno.
- [ ] Pulsar un aviso de cuenta (sin `orderId`) lo marca como leído y no navega; pulsar uno ya leído solo navega, sin llamar al backend.
- [ ] **Marcar todas como leídas** envía `POST /notifications/read-all`, deja el contador en 0 y todos los avisos cargados como leídos; con 0 sin leer el botón queda deshabilitado.
- [ ] `/notificaciones` lista el historial de 20 en 20 con **Cargar más** por cursor, sin repetir ni omitir avisos, y el botón desaparece cuando `nextCursor` es `null`.
- [ ] `?filtro=no-leidas` muestra solo los no leídos de lo cargado y sobrevive a recargar; un valor distinto se trata como "Todas".
- [ ] Un `ADMIN` o un visitante que abre `/notificaciones` termina en `/acceso-denegado` o `/auth/login?returnUrl=…` según corresponda.
- [ ] El ítem **Notificaciones** aparece en el panel de navegación para `PRODUCTOR` y `PROVEEDOR` y no para `ADMIN` ni visitante.
- [ ] Cada una de las ocho plantillas se muestra con su icono y tono propios, y el tono no es la única señal del estado.
- [ ] El sondeo hace una petición a `GET /notifications/unread-count` cada 45 s, ninguna con la pestaña oculta, una inmediata al volver a verla y ninguna sin sesión.
- [ ] Ante `429` o `503` el intervalo se duplica hasta 5 min y vuelve a 45 s tras una respuesta correcta; la campana deja de mostrar insignia y el panel avisa.
- [ ] Con `notifications` apagado (`503`) el panel y la página muestran "El servicio de notificaciones no está disponible" con **Reintentar**, y el resto de la app sigue funcionando.
- [ ] Con el backend apagado el panel y la página muestran "No se pudo conectar con el servidor" con **Reintentar**.
- [ ] Un aviso nuevo muestra un toast; no hay toasts por los avisos que ya existían al iniciar sesión, no se repite el mismo aviso y se muestran como máximo 3 a la vez, con "y N avisos más" si hay más.
- [ ] El toast se cierra solo a los 6 s, se pausa con el puntero encima o con el foco dentro, se cierra con su botón y no roba el foco.
- [ ] Cerrar sesión detiene el sondeo, vacía el contador y los avisos cargados, y un nuevo inicio de sesión de otro usuario no muestra avisos del anterior.
- [ ] Ninguna petición lleva `userId` ni `storeId`, y `titulo` y `mensaje` se muestran como texto, no como HTML.
- [ ] `app-popover` cierra con Esc y clic fuera, devuelve el foco al disparador, declara `aria-expanded` y `aria-controls`, tiene demo funcional en `/ui/popover` y no expone tipos de CDK.
- [ ] `app-toast` se anuncia a lectores de pantalla con `aria-live`, respeta `prefers-reduced-motion`, tiene demo funcional en `/ui/toast` en ambos temas y no expone tipos de Material ni de CDK.
- [ ] La campana, el panel, la página y los toasts no tienen violaciones AXE en claro ni en oscuro, se manejan solo con teclado y a 360, 768 y 1280 px no hay scroll horizontal de página, incluso con un `mensaje` que contiene un id de 24 caracteres.
- [ ] `core/notifications` no importa de `navigation`, `routing`, `layout`, `cart` ni de ninguna feature: `grep -rnE "from '(\.\./)+(navigation|routing|layout|cart|features)" src/app/core/notifications` devuelve vacío, y `features/notificaciones` no importa de otra feature.
- [ ] Ningún `import` estático apunta a un archivo interno de otro módulo (regla de la SPEC 04) y ningún `index.ts` usa `export *`.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] No se escribe nada nuevo en `localStorage`.
- [ ] El chunk lazy de `/notificaciones` aparece por separado en la salida de `ng build`.
- [ ] `ng test` pasa con más tests que la línea base del paso 1 y `npm run build` termina sin errores ni avisos nuevos.
- [ ] `CLAUDE.md` refleja `core/notifications`, `features/notificaciones`, `app-popover`, `app-toast`, la dirección de dependencias y el sondeo.

## Decisiones tomadas y descartadas

- **Sí:** campana con panel más una página `/notificaciones`. El panel sirve para el vistazo rápido y la página para el historial y para móvil.
- **No:** solo campana, porque un historial largo con **Cargar más** dentro de un desplegable es incómodo a 360 px. Tampoco solo página: el usuario tendría que entrar para enterarse.
- **Sí:** sondear solo `unread-count` cada 45 s. Es la llamada más barata, queda dentro del rango de 30 a 60 s que recomienda el backend y deja margen frente al límite de 60/min con varias pestañas.
- **No:** sondear la lista completa en cada ciclo (más datos y más cerca del límite) ni no sondear (el usuario no vería un pago aprobado hasta navegar).
- **Sí:** pausar el sondeo con la pestaña oculta y refrescar al volver. Ahorra peticiones sin que el usuario lo note.
- **Sí:** espera creciente ante `429` o `503`. El backend no reintenta y un sondeo fijo contra un servicio caído solo consume el límite de peticiones.
- **Sí:** clic en un aviso marca como leído y navega al pedido según el rol. Es el gesto esperado y evita un botón por aviso.
- **No:** exigir un botón explícito de "Marcar leída": más fricción para un aviso que casi siempre se abre para verlo.
- **Sí:** enlazar solo los avisos con `orderId`. El backend ya calcula `orderId` y el front no necesita conocer `eventType` ni `correlationId`.
- **No:** enlaces propios para `PROVIDER_APPROVED` o `PROVIDER_REJECTED`. Hay que decidir adónde llevan y qué ven; va en otra spec si hace falta.
- **Sí:** toast al subir el contador, sembrando antes el `id` más reciente con `GET /notifications?limit=1`. Evita avisar de lo que ya estaba al iniciar sesión sin añadir un campo al backend.
- **No:** deducir los avisos nuevos solo por la diferencia del contador. Con lecturas en otra pestaña el número no dice cuáles son nuevos.
- **Sí:** crear `app-popover` y `app-toast` nuevos en `shared/ui` en lugar de forzar `app-menu`, que solo lista ítems, o `app-alert`, que no flota. La regla del proyecto es que solo `shared/ui` conoce Material y CDK.
- **Sí:** filtro **Todas / No leídas** en el cliente y en la URL. El backend no filtra por lectura; se acepta que "No leídas" muestre menos de lo esperado hasta cargar más, y la pantalla lo explica.
- **No:** pedir al backend un parámetro `unread` en esta spec; sería un cambio de contrato fuera de alcance.
- **Sí:** icono y tono por plantilla con un mapa en el front. El texto sigue viniendo del backend; el icono es presentación.
- **Sí:** el estado vive en señales de un servicio de `core/notifications` y no se persiste. Los avisos viven en el servidor y un estado local viejo sería engañoso al cambiar de cuenta.
- **Sí:** `core/notifications` y no una feature, porque el header (`layout`) y la página lo usan y una feature no puede importar de otra.
- **Sí:** la campana no se muestra al `ADMIN`: el backend responde `403` y no hay avisos para él.
- **Sí:** paginación por cursor con **Cargar más**, no por páginas numeradas. El backend no devuelve `total` y el cursor es estable aunque lleguen avisos nuevos mientras se mira.
- **Sí:** la validación del cliente es ayuda de UX; el backend sigue siendo la autoridad.

## Notas de implementación

- `toApiError` convierte `502`, `503` y `504` en «sin conexión» (`status 0`). `NotificationsApi` conserva el `503` real (`status 503`, «El servicio de notificaciones no está disponible») para poder distinguirlo del backend apagado.
- `ToastService` admite 4 toasts a la vez: los 3 avisos más el resumen «y N avisos más».
- La lista (`items`) vive en `NotificationsService` y la comparten el panel (10 avisos) y la página (20 por página).
- El primer sondeo siembra el aviso más reciente con `GET /notifications?limit=1`, sin toast. Si esa petición falla se reintenta tras el siguiente sondeo correcto.
- Contenedor de toasts: `<app-toast />` se monta una sola vez en `App` (`app.html`).
- Línea base del paso 1: 122 archivos y 1143 tests; chunk inicial de 362,27 kB.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `:id` de `/proveedor/pedidos/:id` no es el id del pedido sino el de un sub-pedido (**confirmado en el paso 1**: el detalle usa `GET /orders/provider/sub-orders/:id`) | Se busca el sub-pedido por `orderId` en `GET /orders/provider/sub-orders` (4 páginas de 50) y se navega a su detalle; si no aparece, a la lista. |
| El token del proveedor solo trae `storeId` tras crear la tienda y renovar la sesión, así que sus avisos de tienda (`ORDER_CONFIRMED_STORE`) no aparecerían hasta entonces | El backend lo documenta. El paso 1 comprueba el caso real; renovar la sesión al crear la tienda queda fuera de alcance y, si hace falta, va en su propia spec. |
| Varias pestañas multiplican el sondeo y agotan el límite de 60 lecturas por minuto por IP | 45 s equivale a 1,3 peticiones por minuto por pestaña, la espera crece ante `429` y la pestaña oculta no sondea. |
| Falsos toasts o toasts perdidos porque la comparación por `id` (ObjectId) no refleja el orden de llegada | El backend ordena por `_id` descendente y ese es el mismo criterio; el test cubre avisos nuevos, repetidos y sin avisos nuevos. |
| `notifications` caída deja la campana vacía y el usuario cree que no hay avisos | Estado `degraded` sin insignia y mensaje explícito con **Reintentar** en el panel y en la página. |
| `app-popover` roba o pierde el foco o no se anuncia, o desborda en móvil | Foco devuelto al disparador, `aria-expanded` y `aria-controls`, ancho `min(24rem, 100vw - 2rem)` y criterios de aceptación y AXE sobre el panel. |
| Los toasts molestan a lectores de pantalla o a quien prefiere menos movimiento | `aria-live="polite"` (`alert` solo para `danger`), sin robo de foco, pausa con foco y hover, y sin animación con `prefers-reduced-motion`. |
| Un `mensaje` con un id largo rompe el diseño a 360 px | `break-words` y criterio de aceptación con ese caso a 360 px. |
| El texto de un aviso incluye contenido escrito por el administrador (motivo de rechazo) | Se renderiza solo como texto interpolado, nunca como HTML. |
| La spec toca el header, el shell, `shared/ui` y una feature nueva | Nueve pasos commitables por separado; los dos componentes UI y las utilidades se prueban antes de conectarlos. |

## Lo que **no** está en esta spec

- Push, WebSocket o SSE, y canales reales de envío (email, SMS, notificaciones del navegador).
- Preferencias de notificación, borrar o archivar avisos.
- Avisos para el `ADMIN` y campana en `/auth/*`.
- Enlaces propios para avisos sin pedido.
- Filtro de lectura en el servidor y búsqueda de avisos.
- Sincronización entre pestañas y persistencia local de avisos.
- Renovar la sesión del proveedor al crear su tienda.
- Cualquier cambio en el backend.
- Tests e2e e internacionalización.

Cada uno de estos, si se aborda, va en su propio spec.
