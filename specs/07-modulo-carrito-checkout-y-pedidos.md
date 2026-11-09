# SPEC 07 — Módulo Carrito, checkout y pedidos del productor

> **Status:** Borrador
> **Depends on:** SPEC 03, SPEC 04, SPEC 05, SPEC 06
> **Date:** 2026-11-08
> **Objective:** Permitir que un `PRODUCTOR` agregue presentaciones al carrito desde el catálogo, revise su carrito, confirme el pedido y siga su estado (incluido el cronómetro de pago), reemplazando los placeholders de `/carrito`, `/checkout`, `/pedidos` y `/pedidos/:id` y conectándolos con `/orders/*` del backend.

---

## Por qué existe esta spec

Es la tercera de las cinco specs que implementan el resto de módulos del backend (05 Catálogo público, 06 Proveedor, **07 Carrito y pedidos**, 08 Pagos, 09 Administración). Cierra el tramo "elegir y pedir" de la compra; el cobro es de la SPEC 08.

Contrato del backend que esta spec consume (verificado el 2026-11-08 en `apps/api/src/modules/order/controllers/` y `docs/reglas-de-negocio.md`, secciones "Pedidos" y "Saga de pedido con pago virtual"):

- `GET /orders/cart` devuelve `{ items, total }`. Cada línea trae `variantId`, `cantidad`, `disponible`, `apta` y, si la variante existe, `productId`, `storeId`, `nombreProducto`, `presentacion`, `unidad` y `precioVigente`. Si la variante ya no existe solo trae `variantId`, `cantidad`, `disponible: 0` y `apta: false`. `total` suma solo las líneas aptas y es informativo.
- `PUT /orders/cart/items/:variantId` con `{ cantidad }` **fija** la cantidad (valor absoluto, entero de 1 a 1000, máximo 50 líneas). `DELETE /orders/cart/items/:variantId` y `DELETE /orders/cart` (ambos `204`).
- `POST /orders/checkout` exige el header `Idempotency-Key` (8 a 100 caracteres), crea el pedido en `PENDING`, vacía el carrito y devuelve `201` (o `200` si repite la clave). Con carrito vacío responde `400`; con líneas no aptas responde `400` con `lineas: [{ variantId, motivo: 'NOT_FOUND' | 'NOT_APTA' }]`. **No valida stock.**
- El catálogo reserva el stock de forma asíncrona: el pedido pasa a `AWAITING_PAYMENT` (con `expiresAt` a 15 minutos) o a `CANCELLED`. Si el catálogo no responde en 5 minutos, `CANCELLED`. Sin pago aprobado a los 15 minutos, `CANCELLED`. `CONFIRMED` y `CANCELLED` son finales y no hay cancelación manual.
- `GET /orders?page&limit&status` lista los pedidos propios (más reciente primero); `GET /orders/:id` devuelve el pedido con sub-pedidos por tienda e ítems con su snapshot (nombre, presentación, unidad, precio). Un pedido ajeno responde `404`.
- La respuesta del pedido **no incluye el motivo de la cancelación** (`cancelReason`). Se infiere por `expiresAt` (ver "Modelo de datos").

## Alcance

**Dentro:**

- **`core/cart/`:** `CartService` (señales `items`, `total`, `count`, `status`) y `CartApi`, compartidos por el detalle de producto, el header y la feature `pedidos`. El carrito se carga al quedar la sesión como `PRODUCTOR` y se vacía al dejar de serlo.
- **Agregar desde el catálogo:** en `/catalogo/productos/:id`, solo para `PRODUCTOR`, cada presentación apta (producto sin `requiresQuote`) tiene cantidad y botón **Agregar al carrito**. Si la variante ya está en el carrito, la cantidad pedida se suma a la existente (tope 1000). Producto a cotizar o sin stock no ofrece compra.
- **Contador en el header:** enlace con ícono de carrito y número de líneas junto al menú de usuario, solo para `PRODUCTOR`.
- **`/carrito`:** líneas con producto, presentación, precio vigente, cantidad editable (1 a 1000), subtotal de línea, disponibilidad y botón Quitar; total estimado, **Vaciar carrito** y botón **Continuar** hacia `/checkout`. Las líneas no aptas se marcan y bloquean el avance hasta quitarlas.
- **`/checkout`:** resumen del carrito dividido por tienda (con el nombre de cada tienda) y total, y botón **Confirmar pedido** que genera la `Idempotency-Key`, crea el pedido y navega a `/pedidos/:id`.
- **`/pedidos`:** historial paginado con filtro por estado en la URL (`?status=&page=`).
- **`/pedidos/:id`:** estado del pedido, ítems por tienda con su snapshot y total. Mientras el pedido está `PENDING` se vuelve a consultar cada 2 segundos. En `AWAITING_PAYMENT` muestra el cronómetro de los 15 minutos y el botón **Pagar** hacia `/pedidos/:id/pago`. En `CONFIRMED` y `CANCELLED` muestra el estado final y, si es `CANCELLED`, el mensaje inferido.
- **Estados** en cada pantalla: cargando, vacío, error con Reintentar, `404` y errores de negocio del backend en `app-alert`.
- Sustituir los `loadComponent` de las cuatro rutas conservando `title` y `data` (`RouteInfo`); `/pedidos/:id/pago` sigue como placeholder.
- Actualizar `CLAUDE.md` (módulo `core/cart` y dirección de dependencias) y `route-map.spec.ts` si hace falta.

**Fuera de alcance (otras specs):**

- Pantalla de pago `/pedidos/:id/pago` y `/pagos…` (SPEC 08): el botón Pagar solo enlaza a la ruta.
- Administración de pedidos en solo lectura (SPEC 09) y sub-pedidos del proveedor (SPEC 06).
- Cancelar un pedido a mano, reembolsos y reintentar un pedido cancelado: el backend no lo permite.
- Carrito de visitante (sin sesión) o fusionar carritos: el carrito es del `PRODUCTOR` autenticado.
- Guardar para después, cupones, costo de envío, direcciones y facturación: no existen en el backend.
- Notificaciones en tiempo real (websocket o push): se usa sondeo solo en el detalle de un pedido `PENDING`.
- Notificaciones simuladas (`apps/notifications` no tiene interfaz).
- Tests e2e e internacionalización.

## Modelo de datos

```ts
// src/app/core/cart/models/cart.types.ts  (espejo de las vistas del backend)
export interface CartItem {
  variantId: string;
  cantidad: number;
  disponible: number;
  apta: boolean;
  // Ausentes si la variante ya no existe
  productId?: string;
  storeId?: string;
  nombreProducto?: string;
  presentacion?: string;
  unidad?: string;
  precioVigente?: number; // entero en COP
}
export interface Cart { items: CartItem[]; total: number } // `total` solo suma líneas aptas
export type CartStatus = 'idle' | 'loading' | 'ready' | 'error';

export const MAX_CART_QUANTITY = 1000;
export const MAX_CART_LINES = 50;

// src/app/features/pedidos/models/pedidos.types.ts
export type OrderStatus = 'PENDING' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'CANCELLED';
export interface OrderSummary {
  id: string;
  total: number;
  moneda: 'COP';
  status: OrderStatus;
  expiresAt?: string; // ISO; solo desde AWAITING_PAYMENT
  createdAt: string;
}
export interface OrderItem {
  id: string;
  variantId: string;
  productId: string;
  nombreProducto: string;
  presentacion: string;
  unidad: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}
export interface SubOrder { id: string; storeId: string; subtotal: number; items: OrderItem[] }
export interface Order extends OrderSummary { buyerId: string; subOrders: SubOrder[] }

export interface InvalidCheckoutLine { variantId: string; motivo: 'NOT_FOUND' | 'NOT_APTA' }

export const PEDIDOS_PAGE_SIZE = 10;
export const ORDER_POLL_INTERVAL_MS = 2000;
export const ORDER_PAYMENT_WINDOW_MS = 15 * 60 * 1000;
```

Estructura de carpetas (SPEC 04; solo las que tienen contenido):

```text
src/app/core/cart/
  index.ts                         # CartService, tipos y MAX_CART_QUANTITY, MAX_CART_LINES
  models/cart.types.ts
  services/cart-api.ts             # get, setItem, removeItem, clear
  services/cart.ts                 # CartService (@Service): estado con signals y acciones

src/app/features/pedidos/
  index.ts                         # solo PEDIDOS_ROUTES
  pedidos.routes.ts
  models/pedidos.types.ts
  services/pedidos-api.ts          # checkout(key), listOrders(filter), getOrder(id)
  utils/order-status.ts            # etiquetas, variante de badge, mensaje de cancelación inferido
  utils/countdown.ts               # remainingMs(expiresAt, now) y formato mm:ss (funciones puras)
  utils/checkout-error.ts          # ApiError del backend -> líneas inválidas y mensaje
  utils/filter-params.ts           # ?status=&page= <-> filtro validado
  components/cart-line/
  components/cart-totals/
  components/order-status-badge/
  components/order-countdown/
  components/order-items-by-store/
  pages/carrito/
  pages/checkout/
  pages/mis-pedidos/
  pages/pedido-detalle/
```

Cambios en lo existente:

- `core/layout/components/app-header/`: enlace con contador del carrito para `PRODUCTOR`.
- `features/catalogo/components/variants-table/` y `pages/producto-detalle/`: cantidad y botón de agregar para `PRODUCTOR`.

Convenciones:

- Los precios son enteros en COP y se muestran con `formatCop`. El cliente **no calcula** el total del pedido: usa el `total` del carrito (informativo) y el del pedido. El subtotal de una línea del carrito es `precioVigente × cantidad` solo como ayuda visual.
- Después de cada acción sobre el carrito (`PUT`, `DELETE`) `CartService` vuelve a pedir `GET /orders/cart`, que es la única fuente de verdad (precio y disponibilidad se leen del catálogo cada vez).
- `count` es el número de líneas del carrito (no la suma de unidades). El enlace del header tiene `aria-label` "Carrito, N líneas".
- `cantidad`: entero de 1 a 1000; al agregar se suma a la existente y se limita a 1000, mostrando un aviso si se recortó. No se impide pedir más que `disponible`, pero se avisa ("Supera la disponibilidad actual; el pedido puede ser rechazado"), porque el backend valida stock después del checkout.
- `Idempotency-Key`: `crypto.randomUUID()` generado al primer clic en **Confirmar pedido**, guardado en memoria y reutilizado en los reintentos de esa misma pantalla (un error de red no crea un segundo pedido). Se descarta al tener éxito o cuando cambia el carrito.
- Mensaje de cancelación inferido: `CANCELLED` con `expiresAt` → "El pedido venció sin pago"; sin `expiresAt` → "No se pudo reservar el stock". El backend no devuelve el motivo exacto.
- Sondeo: mientras `status = 'PENDING'` el detalle consulta `GET /orders/:id` cada `ORDER_POLL_INTERVAL_MS` y se detiene al cambiar de estado o al salir de la pantalla. Un fallo de red durante el sondeo no borra lo ya mostrado: se reintenta en el siguiente ciclo.
- Cronómetro: `expiresAt − ahora` se calcula con una función pura y un reloj en una señal que avanza cada segundo; al llegar a 0 se vuelve a consultar el pedido y se muestra lo que diga el backend (que manda: puede seguir `AWAITING_PAYMENT` unos segundos hasta que el job lo cancele). El cronómetro se anuncia a lectores de pantalla con `role="timer"` sin `aria-live` agresivo (solo se anuncia al faltar 5 minutos, 1 minuto y al vencer).
- Filtros de `/pedidos`: `status` solo acepta los cuatro valores; `page` es un entero mayor o igual a 1; cualquier otro valor se ignora. Cambiar el filtro reinicia `page`.
- Dirección de dependencias (se añade a la SPEC 04): `http` ← `auth` ← `cart`; `layout` y las features pueden usar `core/cart`; `core/cart` solo importa de `core/http` y `core/auth`. Las features siguen sin importarse entre sí.

## Plan de implementación

Cada paso deja la app compilando, con `ng test` en verde y `ng build` sin errores. Antes de crear cualquier `app-*` nuevo o ampliar uno se invoca la skill `ui-component`; el diseño visual sigue `frontend-design` y `web-design-guidelines`. La spec se implementa **después de cerrar la SPEC 06** (usa `CatalogApi`, `app-resource-state`, `app-pagination` y `app-input` numérico).

1. **Contrato y línea base.** Con el backend levantado y un `PRODUCTOR` real, verificar con el navegador o `curl` la forma real de `GET /orders/cart`, `PUT` y `DELETE`, `POST /orders/checkout` (`201`, `200` al repetir la clave, `400` con `lineas`), `GET /orders` y `GET /orders/:id` (incluyendo si `expiresAt` aparece en un pedido `CANCELLED` por vencimiento y no en uno por stock). Ajustar "Modelo de datos" si difiere. Anotar el número de tests de `ng test` y los chunks lazy de `ng build`.
2. **`core/cart`.** Crear `models/`, `services/cart-api.ts` (errores como `ApiError`) y `services/cart.ts` (`CartService`: `items`, `total`, `count`, `status`; `load()`, `add(variantId, cantidad)`, `setQuantity`, `remove`, `clear`; carga al quedar la sesión como `PRODUCTOR` y se vacía al dejar de serlo), más `index.ts` con exportaciones nombradas. Specs con `HttpTestingController`: `add` suma a la cantidad existente y recorta a 1000, el estado se recarga tras cada acción, un error deja `status = 'error'` sin perder los datos previos, cambiar la sesión vacía el carrito.
3. **Contador en el header.** Con la skill `ui-component` si hace falta un componente, o con `app-icon` y `app-badge`: enlace a `/carrito` con el número de líneas, visible solo para `PRODUCTOR`, con `aria-label`. Ajustar `app-header.spec.ts`. A 360 px el enlace debe caber sin romper el header.
4. **Agregar desde el catálogo.** Ampliar `variants-table` y `producto-detalle` con cantidad (`app-input` numérico, valor 1 por defecto, entre 1 y 1000) y botón **Agregar al carrito** solo para `PRODUCTOR`, solo en presentaciones aptas y con stock; resultado anunciado con `app-alert` (éxito, recorte a 1000, error del backend, aviso de disponibilidad). Specs de `variants-table` con y sin sesión de productor.
5. **Pantalla `/carrito`.** Crear `components/cart-line/`, `components/cart-totals/` y `pages/carrito/`: edición de cantidad (se confirma con Enter o al salir del campo), Quitar, Vaciar, total y Continuar (deshabilitado con líneas no aptas o carrito vacío). Sustituir el `loadComponent` de `carrito`.
6. **`PedidosApi` y utilidades.** Crear `models/pedidos.types.ts`, `services/pedidos-api.ts` y `utils/` con specs: `PedidosApi` envía `Idempotency-Key` y solo envía los params con valor; `order-status`, `countdown` (límites 0, negativo y formato `mm:ss`), `checkout-error` (cuerpo con `lineas`, cuerpo sin ellas, `status 0`) y `filter-params` (valores inválidos).
7. **Checkout.** Crear `components/order-items-by-store/` y `pages/checkout/`: resume el carrito por tienda (nombre desde `CatalogApi`, con fallback "Tienda" si falla), muestra el total y **Confirmar pedido**. Con éxito recarga el carrito (ya vacío) y navega a `/pedidos/:id`. Con `400` y `lineas` marca las líneas inválidas y ofrece quitarlas. Botón deshabilitado durante el envío. Sustituir el `loadComponent` de `checkout`.
8. **Historial.** Crear `components/order-status-badge/` y `pages/mis-pedidos/` con `app-table`, `app-pagination`, filtro por estado en la URL y estados. Sustituir el `loadComponent` de `pedidos`.
9. **Detalle de pedido.** Crear `components/order-countdown/` y `pages/pedido-detalle/`: sondeo mientras `PENDING`, cronómetro y botón Pagar en `AWAITING_PAYMENT`, ítems por tienda con snapshot, mensaje de cancelación inferido. Sustituir el `loadComponent` de `pedidos/:id`. Pruebas con temporizadores simulados: el sondeo se detiene al cambiar de estado y al destruir la página.
10. **Cierre.** Actualizar `route-map.spec.ts` si hace falta y `CLAUDE.md` (árbol con `core/cart`, dirección de dependencias, "el resto de pantallas siguen siendo placeholders hasta la SPEC 08"). Recorrido manual completo contra el backend (agregar, editar, checkout, pedido `PENDING` → `AWAITING_PAYMENT`, vencimiento, producto sin stock) y revisión AXE.

## Criterios de aceptación

- [ ] `/carrito`, `/checkout`, `/pedidos` y `/pedidos/:id` ya no muestran el placeholder, y un visitante, proveedor o administrador que los abre termina en `/auth/login?returnUrl=…` o `/acceso-denegado` según corresponda.
- [ ] `/pedidos/:id/pago` sigue mostrando el placeholder.
- [ ] Solo un `PRODUCTOR` ve cantidad y botón **Agregar al carrito** en el detalle de producto, y solo en presentaciones aptas con stock; un producto con `requiresQuote` no ofrece compra.
- [ ] Agregar una presentación nueva la deja en el carrito con la cantidad pedida; agregarla otra vez suma a la cantidad existente y, si pasaría de 1000, queda en 1000 con un aviso.
- [ ] Pedir más que `disponible` muestra el aviso de disponibilidad y aun así deja agregar.
- [ ] El header de un `PRODUCTOR` muestra el enlace al carrito con el número de líneas, que se actualiza al agregar y quitar, y no se muestra para otros roles ni para el visitante.
- [ ] Recargar la página como productor conserva el contador y las líneas del carrito (vienen del backend).
- [ ] Al cerrar sesión o cambiar de usuario el carrito en memoria queda vacío y no se muestra el de la sesión anterior.
- [ ] `/carrito` muestra por línea producto, presentación, precio vigente, cantidad, subtotal, disponibilidad y Quitar, y el total estimado.
- [ ] Cambiar la cantidad (entre 1 y 1000) la guarda como valor absoluto y actualiza total y contador; con 0, negativo, decimal o más de 1000 no se envía y se muestra el error.
- [ ] **Quitar** y **Vaciar carrito** funcionan y dejan el estado vacío con enlace al catálogo.
- [ ] Una línea no apta (variante inactiva, sin producto, de tienda desactivada o a cotizar) se marca como no disponible y **Continuar** queda deshabilitado hasta quitarla.
- [ ] Con 50 líneas, agregar otra presentación muestra el error del backend o un aviso previo y no rompe el carrito.
- [ ] `/checkout` con el carrito vacío redirige a `/carrito` con el estado vacío; con líneas muestra el resumen dividido por tienda con su nombre y el total.
- [ ] **Confirmar pedido** envía `POST /orders/checkout` con `Idempotency-Key` de 8 a 100 caracteres, queda deshabilitado durante el envío y un doble clic no genera dos pedidos.
- [ ] Repetir el envío tras un error de red usa la misma `Idempotency-Key`; tras cambiar el carrito usa una nueva.
- [ ] Un `400` con `lineas` marca las líneas inválidas en el resumen y ofrece quitarlas; un carrito vacío muestra el mensaje del backend.
- [ ] Un checkout correcto vacía el carrito local, el contador pasa a 0 y se navega a `/pedidos/:id`.
- [ ] `/pedidos/:id` de un pedido `PENDING` se vuelve a consultar cada 2 segundos y se detiene al pasar a otro estado, al salir de la pantalla o al cerrar la pestaña.
- [ ] En `AWAITING_PAYMENT` se muestra el cronómetro que cuenta desde `expiresAt`, el botón **Pagar** a `/pedidos/:id/pago` y el total del pedido.
- [ ] Al llegar el cronómetro a 0 se vuelve a consultar el pedido y la pantalla muestra el estado que diga el backend.
- [ ] En `CONFIRMED` se muestra el estado final sin botón Pagar; en `CANCELLED`, el mensaje inferido ("venció sin pago" o "no se pudo reservar el stock") y sin botón Pagar.
- [ ] Los ítems se muestran por tienda con el nombre, presentación, unidad, precio unitario, cantidad y subtotal del snapshot, y un cambio posterior del catálogo no los altera.
- [ ] `/pedidos` lista los pedidos propios con fecha, total y estado, paginados, con `?status=` y `?page=` en la URL que sobreviven a recargar; valores inválidos se ignoran.
- [ ] Un pedido ajeno, inexistente o con id inválido muestra "Pedido no encontrado" con enlace a `/pedidos`.
- [ ] Con el backend apagado, cada pantalla muestra "No se pudo conectar con el servidor" con Reintentar, y un fallo durante el sondeo no borra lo ya mostrado.
- [ ] Todos los precios y totales se muestran con `formatCop`.
- [ ] `core/cart` solo importa de `core/http` y `core/auth`, y ninguna feature importa de otra feature: `grep -rnE "from '(\.\./)+(auth|cuenta|catalogo|proveedor|pagos|admin)(/|')" src/app/features/pedidos` devuelve vacío.
- [ ] Ningún `import` estático apunta a un archivo interno de otro módulo (regla de la SPEC 04) y ningún `index.ts` usa `export *`.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] Las cuatro pantallas, el contador del header y el botón del catálogo no tienen violaciones AXE en claro ni en oscuro, todo se maneja con teclado y a 360, 768 y 1280 px no hay scroll horizontal de página.
- [ ] Los chunks lazy de las cuatro pantallas aparecen por separado en la salida de `ng build`.
- [ ] `ng test` pasa con más tests que la línea base del paso 1 y `npm run build` termina sin errores ni avisos nuevos.
- [ ] `CLAUDE.md` refleja `core/cart`, la dirección de dependencias y el estado de los placeholders restantes.

## Decisiones tomadas y descartadas

- **Sí:** `CartService` y `CartApi` en `core/cart/` con estado en signals. Lo usan el detalle de producto (feature catalogo), el header (core) y la feature pedidos, y una feature no puede importar de otra. El backend fija la cantidad como valor absoluto, así que para sumar hay que conocer el carrito actual.
- **No:** un cliente por feature sin estado compartido. El catálogo no podría saber cuánto hay ya en el carrito, y no habría contador.
- **Sí:** contador de líneas en el header solo para `PRODUCTOR`. Es el único rol con carrito y da retroalimentación inmediata al agregar.
- **No:** mostrar el carrito a visitantes. Guardarlo en el cliente y fusionarlo al iniciar sesión es otra feature y el backend no lo contempla.
- **Sí:** recargar `GET /orders/cart` tras cada cambio. El precio, el nombre y la disponibilidad salen del catálogo cada vez, y recalcular a mano duplicaría reglas del backend.
- **No:** actualizaciones optimistas. Para una cantidad pequeña por línea el costo de una petición extra es bajo y evita estados que luego haya que deshacer.
- **Sí:** agregar suma a la cantidad existente (con tope 1000). Es lo que el usuario espera de "Agregar" y el `PUT` absoluto lo permite al conocer el carrito.
- **No:** impedir pedir más que `disponible`. El backend no valida stock en el checkout (lo hace al reservar), así que solo se avisa.
- **Sí:** `Idempotency-Key` con `crypto.randomUUID()`, en memoria y por intento. Un error de red no crea un pedido doble y no se escribe nada en disco.
- **No:** persistir la clave en `localStorage` o `sessionStorage`. Tras el éxito el carrito queda vacío y un segundo checkout daría `400`; no aporta y añade estado que limpiar.
- **Sí:** tras confirmar ir a `/pedidos/:id` y sondear mientras esté `PENDING`. El estado final llega de forma asíncrona (reserva de stock) y esa pantalla ya es el sitio natural para seguirlo, para pagar y para ver el resultado.
- **No:** esperar en `/checkout` y saltar a pagar, ni un botón "Actualizar" sin sondeo. Lo primero ata el flujo a una pantalla que no existe hasta la SPEC 08; lo segundo es peor experiencia.
- **Sí:** sondeo cada 2 segundos solo mientras `PENDING`. El backend tarda en general poco y cancela a los 5 minutos, así que el sondeo está acotado.
- **No:** websockets o notificaciones push. El backend no los ofrece.
- **Sí:** inferir el motivo de la cancelación por `expiresAt` y mostrar un mensaje genérico. El backend no devuelve `cancelReason`; pedirlo queda como mejora del backend.
- **Sí:** el cronómetro usa el reloj del cliente y al llegar a 0 vuelve a consultar. El backend manda: el job de expiración puede tardar unos segundos y un pago tardío todavía se acepta.
- **Sí:** el cronómetro no se anuncia cada segundo a lectores de pantalla. Un anuncio continuo es molesto e inaccesible; se anuncia en hitos.
- **Sí:** `/pedidos/:id/pago` queda como placeholder y el botón Pagar solo enlaza. Es la SPEC 08.
- **Sí:** `PEDIDOS_PAGE_SIZE = 10`, igual que el proveedor: son tablas con varias columnas.
- **Sí:** la validación del cliente (cantidades, filtros) es ayuda de UX; el backend sigue siendo la autoridad.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El backend tarda o falla en pasar el pedido de `PENDING` y el sondeo no termina | Acotado por el timeout de 5 minutos del backend; el sondeo se detiene al salir de la pantalla y un fallo de red no borra lo mostrado. |
| Inferir el motivo de cancelación por `expiresAt` no es exacto en una reserva tardía | El mensaje es genérico, el paso 1 lo verifica con pedidos reales y la mejora queda anotada para el backend. |
| Reloj del cliente desfasado frente al del servidor | Al llegar el cronómetro a 0 se consulta el pedido y manda el estado del backend; el cronómetro es orientativo. |
| Doble clic o reintento crea dos pedidos | `Idempotency-Key` por intento, botón deshabilitado y criterio de aceptación sobre ambos casos. |
| Carrito desactualizado entre pestañas | Cada pantalla de carrito y checkout vuelve a cargar al abrirse; el checkout recalcula en el backend. |
| Una línea deja de ser apta entre el carrito y el checkout | El `400` con `lineas` marca las líneas y permite quitarlas sin perder el resto del carrito. |
| El carrito se carga con el rol equivocado al cambiar de sesión | `CartService` reacciona al rol de `SessionService` y se vacía al dejar de ser `PRODUCTOR`; hay test. |
| El contador rompe el header a 360 px | Criterio de aceptación y revisión a 360, 768 y 1280 px; el enlace es solo ícono con número. |
| `core/cart` introduce un ciclo con `core/auth` o `core/layout` | Dirección de dependencias escrita y verificada con `grep`: `cart` solo importa de `http` y `auth`. |
| Las pruebas con temporizadores (sondeo y cronómetro) son frágiles | Funciones puras para el cálculo y temporizadores simulados de Vitest en los specs de página. |

## Lo que **no** está en esta spec

- Pantalla de pago y pagos del productor (SPEC 08).
- Administración de pedidos y pagos (SPEC 09) y sub-pedidos del proveedor (SPEC 06).
- Cancelar o reintentar pedidos, reembolsos, cupones, envío y direcciones.
- Carrito de visitante y notificaciones en tiempo real.
- Cualquier cambio en el backend (por ejemplo, devolver `cancelReason`).
- Tests e2e e internacionalización.

Cada uno de estos, si se aborda, va en su propio spec.
