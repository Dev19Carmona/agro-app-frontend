# SPEC 09 — Módulo Administración: usuarios, categorías, tiendas, pedidos y pagos

> **Status:** Borrador
> **Depends on:** SPEC 03, SPEC 04, SPEC 05, SPEC 06, SPEC 07, SPEC 08
> **Date:** 2026-11-08
> **Objective:** Reemplazar los nueve placeholders de `/admin/*` por pantallas reales con las que un `ADMIN` gestiona usuarios (aprobar, rechazar, deshabilitar, habilitar y cambiar rol), categorías y tiendas, y consulta en solo lectura todos los pedidos y pagos, conectadas a los endpoints de administración del backend.

---

## Por qué existe esta spec

Es la última de las cinco specs que implementan el resto de módulos del backend (05 Catálogo público, 06 Proveedor, 07 Carrito y pedidos, 08 Pagos, **09 Administración**). Al cerrarla ninguna ruta de la app queda como placeholder.

Contrato del backend que esta spec consume (verificado el 2026-11-08 en `apps/api/src/modules/auth/controllers/users-admin.controller.ts`, `catalog/controllers/catalog-admin.controller.ts`, `order/controllers/orders-admin.controller.ts`, `payments/controllers/payments-admin.controller.ts` y `docs/reglas-de-negocio.md`, secciones "Cuentas y acceso" y "Pedidos"):

- **Usuarios.** `GET /auth/users?rol&status&page&limit` y `GET /auth/users/:id` devuelven la vista de administración (`id`, `email`, `nombre`, `documento`, `rol`, `status`, `storeId?`, `rejectionReason?`, `reviewedBy?`, `reviewedAt?`, `createdAt`). Acciones, todas devuelven el usuario actualizado: `POST /auth/users/:id/approve`, `POST …/reject` (cuerpo opcional `{ reason }`, 1 a 500 caracteres), `POST …/disable`, `POST …/enable` y `PATCH …/role` (`{ rol }`).
- **Reglas de usuarios.** Solo se aprueba o rechaza a un `PROVEEDOR` en `PENDING_APPROVAL`. `ACTIVE` pasa a `DISABLED` y de vuelta. El rol solo se cambia en cuentas `ACTIVE` o `DISABLED`. Un `ADMIN` no puede deshabilitarse ni cambiarse el rol a sí mismo. Deshabilitar o cambiar el rol cierra todas las sesiones de esa cuenta.
- **Categorías.** `POST /catalog/categories` (`{ nombre }`, 1 a 100 caracteres, único sin distinguir mayúsculas ni tildes) y `PATCH /catalog/categories/:id` (`{ nombre?, activa? }`, al menos un campo). **No existe un listado que incluya las inactivas**: `GET /catalog/categories` solo devuelve las activas. El backend va a crear `GET /catalog/admin/categories` (ver "Decisiones"); **no existía en el backend al redactar la spec** y el paso 1 comprueba que esté antes de empezar.
- **Tiendas.** `GET /catalog/admin/stores?page&limit&municipio` (con las desactivadas), `GET`, `PATCH` (`{ nombre?, nit?, municipio? }`) y `POST …/deactivate` en `/catalog/admin/stores/:id`. Desactivar es idempotente y definitivo (no se reactiva).
- **Pedidos.** `GET /orders/admin?page&limit&status&buyerId` (resumen más `buyerId`) y `GET /orders/admin/:id` (pedido completo con sub-pedidos e ítems). Solo lectura.
- **Pagos.** `GET /payments/admin?page&limit&status&buyerId&orderId` y `GET /payments/admin/:id` (pago más `attempts: [{ origen, resultado, motivo?, createdAt }]`). Solo lectura y **limitado a 10 peticiones por minuto**.
- Ninguna respuesta de pagos incluye la clave de idempotencia, el token ni la firma.

## Alcance

**Dentro:**

- **`/admin/usuarios`:** lista paginada con filtros por rol y por estado en la URL (`?rol=&status=&page=`), con nombre, correo, rol, estado y fecha; el filtro "Pendiente de aprobación" permite llegar rápido a las solicitudes.
- **`/admin/usuarios/:id`:** datos del usuario (incluido el documento, solo aquí), motivo y fecha de revisión si los hay, acciones según su estado y enlaces a su tienda, sus pedidos y sus pagos.
  - **Aprobar** y **Habilitar** se ejecutan sin confirmación.
  - **Rechazar** (con motivo opcional), **Deshabilitar** y **Cambiar rol** piden confirmación con `app-dialog`.
  - Las acciones que no corresponden al estado no se muestran, y las que el administrador no puede hacer sobre sí mismo se sustituyen por una nota.
- **`/admin/categorias`:** lista (activas e inactivas) con alta, renombrar y activar o desactivar.
- **`/admin/tiendas`:** lista paginada con filtro por municipio y badge "Inactiva".
- **`/admin/tiendas/:id`:** datos y edición (nombre, NIT, municipio), enlace al dueño y a la ficha pública, y **Desactivar tienda** con confirmación (deshabilitado y explicado si ya está inactiva).
- **`/admin/pedidos` y `/admin/pedidos/:id`:** lista paginada con filtros por estado y comprador en la URL y detalle de solo lectura con sub-pedidos por tienda.
- **`/admin/pagos` y `/admin/pagos/:id`:** lista paginada con filtros por estado, comprador y pedido en la URL y detalle de solo lectura con el historial de intentos.
- **Componente UI nuevo `app-dialog`** (confirmación con título, descripción, contenido proyectado opcional, foco atrapado y Esc), creado con la skill `ui-component`, con demo en `/ui/dialog`.
- **Mover a módulos compartidos lo que ahora usan dos features** (refactor puro, paso 2): tipos de pago, estados y la insignia de pago a `core/payments/`; el tipo de tienda de administración a `core/catalog/`; la lista de sub-pedidos por tienda a `core/orders/`.
- `AdminApi` en `features/admin/services/`, sobre `HttpClient` y con `rxResource` o señales, sin librerías nuevas.
- Sustituir los `loadComponent` de las nueve rutas conservando `title` y `data` (`RouteInfo`).
- Un test en `route-map.spec.ts` que comprueba que ninguna ruta de la app usa ya el placeholder.
- Actualizar `CLAUDE.md`.

**Fuera de alcance (otras specs):**

- Crear usuarios `ADMIN` o promover desde fuera de `PATCH …/role`: el primero lo crea `seed:admin` en el backend.
- Borrar usuarios, tiendas, categorías, pedidos o pagos; reactivar una tienda desactivada; editar o cancelar pedidos; reembolsos. El backend no lo permite.
- Administrar productos, presentaciones y stock: el administrador no los gestiona (reglas de negocio).
- Resolver nombres de comprador en pedidos y pagos: el backend solo envía `buyerId`; se muestra el id y se enlaza al usuario.
- Exportar a CSV o Excel, gráficas y paneles de métricas.
- Bitácora de acciones del administrador y notificaciones simuladas (sin API).
- Cerrar sesiones de un usuario a mano: el backend no tiene endpoint.
- Tests e2e e internacionalización.

## Modelo de datos

```ts
// src/app/features/admin/models/admin.types.ts (espejo de las vistas de administración)
export type UserRole = 'PRODUCTOR' | 'PROVEEDOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED';

export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  documento: string;
  rol: UserRole;
  status: UserStatus;
  storeId?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string; // ISO
  createdAt: string; // ISO
}
export interface UsersFilter { rol?: UserRole; status?: UserStatus; page: number }

export interface AdminCategory { id: string; nombre: string; activa: boolean }

export interface StoresFilter { municipio?: string; page: number }
export interface UpdateStoreRequest { nombre?: string; nit?: string; municipio?: string }

export interface AdminOrderSummary extends OrderSummary { buyerId: string } // `OrderSummary` de core/orders
export interface AdminOrdersFilter { status?: OrderStatus; buyerId?: string; page: number }

export interface PaymentAttempt {
  origen: string; // se muestra tal cual
  resultado: string;
  motivo?: string;
  createdAt: string; // ISO
}
export interface AdminPayment extends Payment { buyerId: string } // `Payment` de core/payments
export interface AdminPaymentDetail extends AdminPayment { attempts: PaymentAttempt[] }
export interface AdminPaymentsFilter { status?: PaymentStatus; buyerId?: string; orderId?: string; page: number }

export const ADMIN_PAGE_SIZE = 10;
export const REJECT_REASON_MAX_LENGTH = 500;
export const CATEGORY_NAME_MAX_LENGTH = 100;
```

Reglas de acción sobre un usuario (función pura en `utils/user-actions.ts`, con test):

| Acción | Se ofrece si |
| --- | --- |
| Aprobar y Rechazar | `rol = PROVEEDOR` y `status = PENDING_APPROVAL` |
| Deshabilitar | `status = ACTIVE` y no es el administrador actual |
| Habilitar | `status = DISABLED` |
| Cambiar rol | `status` es `ACTIVE` o `DISABLED` y no es el administrador actual |

Estructura de carpetas (SPEC 04; solo las que tienen contenido):

```text
src/app/shared/ui/dialog/           # app-dialog: dialog.ts, dialog.types.ts, dialog.spec.ts, dialog-demo.ts

src/app/core/payments/              # movido desde features/pagos (SPEC 08)
  index.ts                          # Payment, PaymentStatus, PaymentMethod, paymentStatusLabel, PaymentStatusBadge
  models/payments.types.ts
  utils/payment-status.ts
  components/payment-status-badge/

src/app/core/catalog/               # + StoreDetail (movido desde features/proveedor como MyStore)
src/app/core/orders/                # + components/order-items-by-store/ (movido desde features/pedidos)

src/app/features/admin/
  index.ts                          # solo ADMIN_ROUTES
  admin.routes.ts
  models/admin.types.ts
  services/admin-api.ts             # listUsers, getUser, approveUser, rejectUser, disableUser, enableUser,
                                    # changeUserRole, listCategories, createCategory, updateCategory,
                                    # listStores, getStore, updateStore, deactivateStore,
                                    # listOrders, getOrder, listPayments, getPayment
  utils/user-actions.ts             # qué acciones aplican a cada usuario
  utils/user-labels.ts              # etiquetas y variante de badge de estado de usuario
  utils/filter-params.ts            # query params <-> filtros validados (usuarios, tiendas, pedidos, pagos)
  components/user-status-badge/
  components/user-actions/          # botones y diálogos de confirmación de un usuario
  components/category-form/
  components/store-form/            # edición de tienda (admin)
  components/attempts-table/
  components/admin-filters/         # selectores y campos de filtro reutilizables
  pages/usuarios/
  pages/usuario-detalle/
  pages/categorias/
  pages/tiendas/
  pages/tienda-detalle/
  pages/pedidos/
  pages/pedido-detalle/
  pages/pagos/
  pages/pago-detalle/
```

Convenciones:

- Los montos se muestran con `formatCop` y las fechas con `Intl.DateTimeFormat('es-CO')`.
- El documento del usuario se muestra solo en `/admin/usuarios/:id`, nunca en la lista, y no se escribe en consola ni en la URL (mínimo de datos, Habeas Data).
- Tras cada acción sobre un usuario, la pantalla usa el usuario que devuelve el backend (no recarga la lista), y muestra el resultado en un `app-alert`. Mientras la acción está en curso sus botones quedan deshabilitados y no se permite un segundo envío.
- Identificar al administrador actual: `SessionService.user().id` frente al `id` del usuario. El backend sigue siendo la autoridad y su `403` o `409` se muestra tal cual.
- `app-dialog`: botón de confirmar con variante `danger` en rechazar, deshabilitar y desactivar tienda, y `primary` en cambiar rol; el foco pasa al diálogo al abrir y vuelve al botón que lo abrió al cerrar; Esc y Cancelar cierran sin ejecutar. El campo del motivo de rechazo es un `app-input` proyectado, opcional, de hasta 500 caracteres.
- Cambiar rol ofrece los roles distintos del actual en un `app-select` dentro del diálogo, que avisa de que se cerrarán las sesiones de esa cuenta.
- Categorías: el nombre se recorta y se valida (1 a 100 caracteres); un `409` por nombre repetido se muestra junto al campo. Activar o desactivar usa una casilla y es reversible, sin diálogo.
- Desactivar una tienda es definitivo: el diálogo lo dice y, ya inactiva, el botón queda deshabilitado con la explicación "Una tienda desactivada no se reactiva".
- Pedidos y pagos de administración son de solo lectura: ninguna pantalla ofrece botones de modificación. El comprador se muestra como `buyerId` abreviado con enlace a `/admin/usuarios/:id` y el pedido de un pago con enlace a `/admin/pedidos/:id`.
- Nombres de tienda en el detalle de un pedido: se consulta `GET /catalog/admin/stores/:id` una sola vez por `storeId` distinto, en paralelo; si falla, esa tienda muestra su id abreviado.
- Filtros en la URL: `rol`, `status` solo aceptan los valores del tipo; `buyerId` y `orderId` solo 24 hex; `municipio` se recorta y se limita a 100 caracteres; `page` es un entero mayor o igual a 1; cualquier otro valor se ignora; cambiar un filtro reinicia `page`.
- Un `429` en las pantallas de pagos muestra "Demasiados intentos, espera un minuto". Estas pantallas no sondean.
- Dirección de dependencias (se añade a la SPEC 04): `http` ← `payments`; `features/admin` usa `core/auth`, `core/catalog`, `core/orders`, `core/payments` y `core/navigation` (etiquetas de rol) y nunca otra feature.

## Plan de implementación

Cada paso deja la app compilando, con `ng test` en verde y `ng build` sin errores. Antes de crear cualquier `app-*` se invoca la skill `ui-component`; el diseño visual sigue `frontend-design` y `web-design-guidelines`. La spec se implementa **después de cerrar la SPEC 08** y de que el backend tenga `GET /catalog/admin/categories`.

1. **Contrato y línea base.** Con el backend levantado y un `ADMIN`, verificar con el navegador o `curl` la forma real de cada endpoint: que `GET /catalog/admin/categories` existe y devuelve todas las categorías con `{ id, nombre, activa }` (si no existe, detener la spec y avisar), los errores de cada acción de usuario (aprobar a un no pendiente, deshabilitarse a sí mismo, rol de una cuenta pendiente), el `409` de una categoría repetida, `GET /catalog/admin/stores/:id`, los valores de `origen` en `attempts` y el `429` de `payments/admin`. Ajustar "Modelo de datos" si difiere. Anotar el número de tests de `ng test` y los chunks lazy de `ng build`.
2. **Mover lo compartido (refactor sin cambio de comportamiento).** Con `git mv`: tipos de pago, `payment-status` y `payment-status-badge` desde `features/pagos` a `core/payments/`; `MyStore` desde `features/proveedor` a `core/catalog/models/` como `StoreDetail`; `order-items-by-store` desde `features/pedidos` a `core/orders/components/`, ajustando sus entradas a `subOrders` y `storeNames`. Exportar lo público desde los `index.ts` (sin `export *`) y ajustar imports y specs de `features/pagos`, `features/proveedor` y `features/pedidos`. `ng test` debe dar el mismo número de tests que la línea base.
3. **`app-dialog`.** Con la skill `ui-component`: componente de confirmación (`open` como `model`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant`, `busy`, contenido proyectado, salidas `confirmed` y `cancelled`), con foco atrapado, Esc, `aria-labelledby` y `aria-describedby`. Solo `shared/ui/dialog` importa Material o CDK. Spec y demo `/ui/dialog` (ruta nueva en `app.routes.ts`).
4. **`AdminApi`, tipos y utilidades.** Crear `models/admin.types.ts`, `services/admin-api.ts` (solo se envían los params y campos con valor; `reason` vacío se omite; errores como `ApiError`) y `utils/` con specs: `AdminApi` con `HttpTestingController` (URLs, métodos y cuerpos de cada acción), `user-actions` (tabla de reglas incluida la autoprotección), `user-labels` y `filter-params` (valores inválidos de cada filtro).
5. **Usuarios (lista).** Crear `components/user-status-badge/`, `components/admin-filters/` y `pages/usuarios/` con `app-table`, `app-pagination`, filtros en la URL y estados. Sustituir el `loadComponent` de `usuarios`.
6. **Usuario (detalle y acciones).** Crear `components/user-actions/` y `pages/usuario-detalle/`: datos, acciones según `user-actions`, diálogos de rechazo (con motivo), deshabilitar y cambiar rol, y enlaces a tienda, pedidos y pagos. Sustituir el `loadComponent` de `usuarios/:id`. Specs: cada acción llama al endpoint correcto, un administrador no ve las acciones sobre sí mismo, Cancelar no ejecuta nada.
7. **Categorías.** Crear `components/category-form/` y `pages/categorias/`: lista con activas e inactivas, alta, renombrar y casilla de activa. Sustituir el `loadComponent` de `categorias`.
8. **Tiendas.** Crear `components/store-form/`, `pages/tiendas/` (paginada, filtro por municipio) y `pages/tienda-detalle/` (edición y desactivación con diálogo). Sustituir los `loadComponent` de `tiendas` y `tiendas/:id`.
9. **Pedidos.** Crear `pages/pedidos/` (filtros por estado y comprador) y `pages/pedido-detalle/` (sub-pedidos por tienda con `order-items-by-store` de `core/orders` y nombres de tienda en paralelo). Sustituir los `loadComponent` de `pedidos` y `pedidos/:id`.
10. **Pagos.** Crear `components/attempts-table/`, `pages/pagos/` y `pages/pago-detalle/`, con `payment-status-badge` de `core/payments`. Sustituir los `loadComponent` de `pagos` y `pagos/:id`.
11. **Cierre.** Añadir a `route-map.spec.ts` la comprobación de que ninguna ruta usa `RoutePlaceholder` y actualizar `CLAUDE.md` (árbol con `core/payments`, `app-dialog`, dirección de dependencias, y que la app ya no tiene pantallas placeholder). Recorrido manual completo contra el backend con un `ADMIN` real y revisión AXE de todas las pantallas nuevas.

## Criterios de aceptación

- [ ] Las nueve rutas de `/admin/*` ya no muestran el placeholder, y un visitante, productor o proveedor que las abre termina en `/auth/login?returnUrl=…` o `/acceso-denegado` según corresponda.
- [ ] Ninguna ruta del árbol de la app declara el componente `RoutePlaceholder`, comprobado por un test de `route-map.spec.ts`.
- [ ] `/admin/usuarios` lista usuarios con nombre, correo, rol, estado y fecha, paginados, sin mostrar el documento, con `?rol=`, `?status=` y `?page=` en la URL que sobreviven a recargar; valores inválidos se ignoran.
- [ ] Filtrar por "Pendiente de aprobación" muestra solo proveedores pendientes.
- [ ] En `/admin/usuarios/:id` de un proveedor pendiente se ofrecen **Aprobar** y **Rechazar**; tras aprobar, el estado pasa a Activo sin recargar y esas acciones desaparecen.
- [ ] **Rechazar** abre un diálogo con campo de motivo opcional; confirmar envía `POST …/reject` con `reason` (u omitido si está vacío) y muestra el estado Rechazado con el motivo; Cancelar o Esc no envían nada.
- [ ] **Deshabilitar** abre un diálogo que avisa del cierre de sesiones; confirmar pasa la cuenta a Deshabilitado y ofrece **Habilitar**, que reactiva sin confirmación.
- [ ] **Cambiar rol** ofrece solo los roles distintos del actual, avisa del cierre de sesiones, solo aparece en cuentas activas o deshabilitadas y actualiza el rol mostrado.
- [ ] En su propio usuario, el administrador no ve **Deshabilitar** ni **Cambiar rol** y ve la nota que lo explica; si el backend responde con error, se muestra su mensaje.
- [ ] Un usuario con `storeId` muestra enlace a `/admin/tiendas/:storeId`; un productor muestra enlaces a sus pedidos y pagos con `?buyerId=` aplicado.
- [ ] `/admin/categorias` lista categorías activas e inactivas, y una categoría desactivada sigue visible y se puede reactivar.
- [ ] Crear una categoría con nombre válido la agrega a la lista; con un nombre repetido (sin distinguir mayúsculas ni tildes) muestra el `409` junto al campo y conserva lo escrito; con nombre vacío o de más de 100 caracteres no se envía.
- [ ] Renombrar y activar o desactivar una categoría actualiza la fila con la respuesta del backend, sin recargar.
- [ ] `/admin/tiendas` lista tiendas activas e inactivas, paginadas, con filtro por municipio en la URL y badge "Inactiva".
- [ ] `/admin/tiendas/:id` permite editar nombre, NIT y municipio (al menos un campo) y muestra el error del backend sin perder lo escrito.
- [ ] **Desactivar tienda** abre un diálogo que avisa de que no se reactiva; confirmar la deja Inactiva y deshabilita el botón con la explicación; en una tienda ya inactiva el botón nace deshabilitado.
- [ ] Una tienda desactivada deja de aparecer en `/catalogo/tiendas` y sus productos en `/catalogo`.
- [ ] `/admin/pedidos` lista todos los pedidos con fecha, total, estado y comprador (id abreviado con enlace al usuario), paginados, con `?status=`, `?buyerId=` y `?page=` en la URL.
- [ ] `/admin/pedidos/:id` muestra el pedido con sus sub-pedidos por tienda y los ítems con su snapshot, con el nombre de cada tienda (o su id abreviado si no se pudo obtener), y no ofrece ninguna acción.
- [ ] `/admin/pagos` lista todos los pagos con fecha, método, monto, estado y comprador, paginados, con `?status=`, `?buyerId=`, `?orderId=` y `?page=` en la URL.
- [ ] `/admin/pagos/:id` muestra el pago y el historial de intentos (origen, resultado, motivo y fecha), con enlace al pedido, y no ofrece ninguna acción.
- [ ] Un `429` en las pantallas de pagos muestra "Demasiados intentos, espera un minuto" y no rompe la pantalla.
- [ ] Un id de usuario, tienda, pedido o pago inexistente o con formato inválido muestra "… no encontrado" con enlace a su lista, y no una pantalla en blanco.
- [ ] Con el backend apagado, cada pantalla muestra "No se pudo conectar con el servidor" con Reintentar, y una acción fallida muestra el error sin cambiar el estado mostrado.
- [ ] Durante una acción en curso sus botones quedan deshabilitados y un doble clic no la envía dos veces.
- [ ] `app-dialog` atrapa el foco, se cierra con Esc, devuelve el foco al botón que lo abrió, se anuncia con título y descripción accesibles, tiene demo funcional en `/ui/dialog` en ambos temas y no expone tipos de Material ni de CDK.
- [ ] Los montos se muestran con `formatCop` y el documento del usuario solo aparece en su detalle.
- [ ] Tipos y insignia de pago viven en `core/payments`, `StoreDetail` en `core/catalog` y `order-items-by-store` en `core/orders`, y las features que los usaban funcionan igual, con el mismo número de tests que la línea base tras el paso 2.
- [ ] `features/admin` no importa de otra feature: `grep -rnE "from '(\.\./)+(auth|cuenta|catalogo|proveedor|pedidos|pagos)(/|')" src/app/features/admin` devuelve vacío, y `core/payments` solo importa de `core/http`.
- [ ] Ningún `import` estático apunta a un archivo interno de otro módulo (regla de la SPEC 04) y ningún `index.ts` usa `export *`.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] Las nueve pantallas y los diálogos no tienen violaciones AXE en claro ni en oscuro, el resultado de cada acción se anuncia a lectores de pantalla, todo se maneja con teclado y a 360, 768 y 1280 px no hay scroll horizontal de página.
- [ ] Los chunks lazy de las nueve pantallas aparecen por separado en la salida de `ng build`.
- [ ] `ng test` pasa con más tests que la línea base del paso 1 y `npm run build` termina sin errores ni avisos nuevos.
- [ ] `CLAUDE.md` refleja `core/payments`, `app-dialog`, la dirección de dependencias y que la app no tiene pantallas placeholder.

## Decisiones tomadas y descartadas

- **Sí:** esperar la ruta `GET /catalog/admin/categories` del backend (todas las categorías con `{ id, nombre, activa }`) y construir sobre ella. Sin ella una categoría desactivada desaparece y no se puede reactivar.
- **No:** limitación solo en frontend ni recordar las desactivadas en memoria. Lo primero deja una acción sin vuelta atrás; lo segundo se pierde al recargar.
- **Sí:** `app-dialog` de confirmación para rechazar, deshabilitar, cambiar rol y desactivar tienda. Son acciones que cortan sesiones o no se deshacen, y un clic accidental no debe bastar.
- **No:** confirmación en línea ni acciones sin confirmar. Lo primero es fácil de pasar por alto y confunde en móvil; lo segundo permite deshabilitar una cuenta o desactivar una tienda para siempre por error.
- **Sí:** aprobar y habilitar sin confirmación. Son reversibles o constructivas y añadir un paso solo frena la revisión de solicitudes.
- **Sí:** activar o desactivar una categoría sin diálogo. Es reversible con la misma casilla.
- **Sí:** el motivo del rechazo es un `app-input` proyectado dentro del diálogo. Evita un componente `app-textarea` para un solo campo opcional de hasta 500 caracteres.
- **Sí:** ocultar las acciones que no corresponden al estado y sustituir por una nota las que el administrador no puede hacer sobre sí mismo. Es ayuda de UX; el backend sigue siendo la autoridad.
- **Sí:** mostrar el documento solo en el detalle del usuario. El administrador lo necesita para evaluar una solicitud de proveedor, y la lista no debe exponer datos innecesarios.
- **Sí:** mostrar `buyerId` abreviado con enlace al usuario en pedidos y pagos. El backend no envía el nombre y resolverlo exigiría una petición por fila.
- **No:** resolver nombres de comprador con una consulta por fila. Es N+1 y, en pagos, agotaría el límite de 10 peticiones por minuto.
- **Sí:** las pantallas de pedidos y pagos son de solo lectura, sin botones de modificación. El backend no tiene endpoints para cambiarlos y las reglas lo prohíben.
- **Sí:** mover tipos y la insignia de pago a `core/payments`, `StoreDetail` a `core/catalog` y la lista de sub-pedidos por tienda a `core/orders`. Una feature no puede importar de otra y estas piezas ya las necesitan dos features.
- **No:** duplicar esos tipos en `features/admin`. Los contratos del backend divergirían con el tiempo.
- **Sí:** consultar `GET /catalog/admin/stores/:id` por cada `storeId` distinto del pedido para rotular las tiendas, incluso desactivadas. El listado público solo trae las activas.
- **Sí:** `placeholderRoute` y `RoutePlaceholder` se conservan aunque ninguna ruta los use. Es el patrón documentado para añadir una pantalla nueva; retirarlos es limpieza que va en otra spec. Un test garantiza que hoy no se usan.
- **Sí:** `ADMIN_PAGE_SIZE = 10`, igual que el resto de módulos.
- **Sí:** la validación del cliente es ayuda de UX; el backend sigue siendo la autoridad.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| `GET /catalog/admin/categories` aún no existe o difiere de lo asumido | El paso 1 la verifica y detiene la spec si falta; el modelo se ajusta a la respuesta real. |
| El administrador se bloquea a sí mismo (deshabilita su cuenta o cambia su rol) | La UI oculta esas acciones y el backend las rechaza; hay test de autoprotección. |
| Un clic accidental deshabilita una cuenta o desactiva una tienda | Diálogo de confirmación con variante de peligro y aviso de las consecuencias. |
| El límite de 10 peticiones por minuto de `payments/admin` produce `429` al filtrar rápido | Mensaje claro, sin sondeo y sin peticiones por fila; la UI no se rompe y el siguiente intento funciona. |
| `app-dialog` roba o pierde el foco o no se anuncia | Foco atrapado y devuelto al origen, `aria-labelledby` y `aria-describedby`, y criterios de aceptación y AXE sobre los diálogos. |
| Mover tipos, insignia y lista por tienda rompe imports o specs de las SPEC 06 a 08 | Paso 2 aislado como refactor puro con `ng test` con el mismo número de tests y `ng build` en verde antes de seguir. |
| El administrador cambia el rol de un proveedor con tienda y deja datos inconsistentes | El backend manda; se muestra su mensaje y el aviso del diálogo es informativo. El paso 1 verifica el comportamiento real. |
| La spec es grande (cuatro dominios, nueve pantallas y un componente) | Once pasos commitables por separado; las pantallas de cada dominio son independientes y se pueden partir en commits por pantalla. |
| Mostrar el documento del usuario expone un dato personal | Solo en el detalle, nunca en lista, URL ni consola; ruta restringida a `ADMIN`. |

## Lo que **no** está en esta spec

- Crear usuarios `ADMIN`, borrar usuarios, tiendas, categorías, pedidos o pagos, y reactivar tiendas desactivadas.
- Modificar pedidos o pagos, cancelar pedidos y reembolsos.
- Administrar productos, presentaciones y stock.
- Nombres de comprador en pedidos y pagos, exportaciones, gráficas y paneles de métricas.
- Bitácora de acciones del administrador y cerrar sesiones de un usuario a mano.
- Cualquier cambio en el backend más allá de `GET /catalog/admin/categories`.
- Tests e2e e internacionalización.

Cada uno de estos, si se aborda, va en su propio spec.
