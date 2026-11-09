# SPEC 06 — Módulo Proveedor: tienda, productos, presentaciones, stock y pedidos recibidos

> **Status:** Aprobado
> **Depends on:** SPEC 03, SPEC 04, SPEC 05
> **Date:** 2026-11-08
> **Objective:** Reemplazar los seis placeholders de `/proveedor/*` por pantallas reales con las que un `PROVEEDOR` crea su tienda, administra productos, presentaciones y stock, y consulta los sub-pedidos pagados de su tienda, conectadas a los endpoints `/catalog/*` y `/orders/provider/*` del backend.

---

## Por qué existe esta spec

Es la segunda de las cinco specs que implementan el resto de módulos del backend (05 Catálogo público, **06 Proveedor**, 07 Carrito y pedidos, 08 Pagos, 09 Administración). El proveedor va antes de la compra porque sin productos y stock publicados no hay nada que comprar.

Contrato del backend que esta spec consume (verificado el 2026-11-08 en `apps/api/src/modules/catalog/controllers/provider-catalog.controller.ts` y `apps/api/src/modules/order/controllers/provider-orders.controller.ts`):

- `POST /catalog/stores` (`{ nombre, nit, municipio }`) crea la tienda; una por proveedor, `409` si ya tiene una o el NIT se repite. `GET /catalog/my-store` la devuelve (con `nit`, `ownerId` y `activa`) o `404`.
- `GET /catalog/my-store/products?page&limit` devuelve los productos de la tienda, **activos e inactivos**, con todas sus variantes y su `stock`, `stockReservado` y `activo`. **Esta ruta es nueva y estaba en el árbol de trabajo del backend, sin commitear, al redactar la spec**; el paso 1 comprueba que existe antes de empezar.
- `POST /catalog/products`, `PATCH /catalog/products/:id`, `POST /catalog/products/:id/variants`, `PATCH /catalog/variants/:id` y `PATCH /catalog/variants/:id/stock` (valor absoluto; `409` si queda bajo lo reservado). `storeId` nunca viaja en el body.
- `GET /orders/provider/sub-orders` y `/:id` devuelven solo sub-pedidos de pedidos pagados (siempre `CONFIRMED`), sin comprador ni total del pedido. La tienda sale del claim `storeId` del access token, que **solo se actualiza al renovar el refresh token**, no al crear la tienda.
- No hay `GET /catalog/my-store/products/:id`. La pantalla de edición tiene que leer el producto del listado (ver "Decisiones").
- No hay endpoint para editar la tienda como proveedor (solo el `ADMIN`, SPEC 09), ni para borrar productos o variantes (se desactivan con `activo`).

## Alcance

**Dentro:**

- **`/proveedor/tienda`:** sin tienda, formulario de creación (`nombre`, `nit`, `municipio`); con tienda, ficha de solo lectura (nombre, NIT, municipio, estado, fecha de creación) y enlace a su página pública `/catalogo/tiendas/:id`. Si `activa = false`, aviso de que la tienda está desactivada, no aparece en el catálogo y no admite productos nuevos.
- **Renovar la sesión al crear la tienda:** tras `POST /catalog/stores` se hace un refresh (`SessionRefresher`) para que el access token traiga `storeId`.
- **`/proveedor/productos`:** lista paginada de productos propios (activos e inactivos) con estado, categoría, número de presentaciones y resumen de stock disponible; acciones Editar y Nuevo producto.
- **`/proveedor/productos/nuevo`:** formulario de producto (`nombre`, `marca`, `categoryId`, ficha técnica clave-valor, `requiresQuote`); al crear redirige a `/proveedor/productos/:id` para agregar presentaciones.
- **`/proveedor/productos/:id`:** edición del producto (incluye `activo`), lista de presentaciones con edición de `presentacion`, `unidad`, `precio`, `precioOferta` (con opción de quitarla) y `activo`, edición de stock por presentación (valor absoluto, mínimo lo reservado) y alta de nuevas presentaciones.
- **`/proveedor/pedidos` y `/proveedor/pedidos/:id`:** sub-pedidos pagados de la tienda en solo lectura (fecha, subtotal, ítems con su snapshot) con paginación, y su detalle.
- **Estados** en cada pantalla: cargando, vacío, error con Reintentar, `404` y errores de validación del backend (`400`, `409`) junto al campo o en un `app-alert`.
- **Mover a módulos compartidos lo que ahora usan dos features** (refactor puro, paso 2): `CatalogoApi` pasa a `core/catalog/services/` como `CatalogApi` (con sus tipos de filtro); `resourceApiError` pasa a `core/http/utils/`; el estado cargando-error-vacío de catálogo pasa a un componente `app-resource-state` en `shared/ui`.
- **Ampliar `app-input`** con `type="number"` (valor numérico), con la skill `ui-component`.
- `ProveedorApi` en `features/proveedor/services/`, sobre `HttpClient` y con `rxResource` o señales en las pantallas, sin librerías nuevas.
- Sustituir los `loadComponent` de las seis rutas conservando `title` y `data` (`RouteInfo`).
- Actualizar `CLAUDE.md` y `route-map.spec.ts` si hace falta.

**Fuera de alcance (otras specs):**

- Editar o desactivar la tienda: el proveedor no tiene endpoint; es del `ADMIN` (SPEC 09).
- Borrar productos o presentaciones: no existe en el backend; se desactivan.
- Cambiar el estado de un sub-pedido o despachar: el backend no lo permite (solo lectura).
- Mostrar el comprador o el total del pedido al proveedor: el backend no los envía.
- Imágenes de producto, carga masiva por CSV o Excel, y ajustes de stock por delta.
- Gestión de categorías (SPEC 09). El proveedor solo las elige.
- Carrito, checkout y pagos (SPEC 07 y 08).
- Un `GET /catalog/my-store/products/:id` propio: queda como mejora del backend.
- Tests e2e e internacionalización.

## Modelo de datos

```ts
// src/app/features/proveedor/models/proveedor.types.ts (espejo de las vistas del backend)
export interface MyStore {
  id: string;
  nombre: string;
  nit: string;
  ownerId: string;
  municipio: string;
  activa: boolean;
  createdAt: string; // ISO
}
export interface CreateStoreRequest { nombre: string; nit: string; municipio: string }

export interface MyVariant {
  id: string;
  productId: string;
  presentacion: string;
  unidad: string;
  precio: number; // entero en COP
  precioOferta?: number; // menor que `precio`
  precioVigente: number;
  stock: number;
  stockReservado: number;
  disponible: number; // stock - stockReservado
  activo: boolean;
}
export interface MyProduct extends Product {
  // `Product` viene de core/catalog; el proveedor ve también los inactivos
  variantes: MyVariant[];
}

export interface CreateProductRequest {
  categoryId: string;
  nombre: string;
  marca: string;
  fichaTecnica: Record<string, string>;
  requiresQuote?: boolean;
}
export type UpdateProductRequest = Partial<CreateProductRequest> & { activo?: boolean };

export interface CreateVariantRequest {
  presentacion: string;
  unidad: string;
  precio: number;
  precioOferta?: number;
  stock: number;
}
export interface UpdateVariantRequest {
  presentacion?: string;
  unidad?: string;
  precio?: number;
  precioOferta?: number | null; // null quita la oferta
  activo?: boolean;
}

export interface ProviderOrderItem {
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
export interface ProviderSubOrder {
  id: string;
  orderId: string;
  status: 'CONFIRMED';
  subtotal: number;
  createdAt: string; // ISO
  items: ProviderOrderItem[];
}

// Filas del editor de ficha técnica (el backend usa un Record)
export interface FichaRow { clave: string; valor: string }

export const PROVEEDOR_PAGE_SIZE = 10;
export const FICHA_MAX_ENTRADAS = 30; // clave máx. 50 caracteres, valor máx. 500
```

Estructura de carpetas (SPEC 04; solo las que tienen contenido):

```text
src/app/core/catalog/        # + services/catalog-api.ts y models/ con los tipos de filtro (movidos desde features/catalogo)
src/app/core/http/           # + utils/resource-api-error.ts (movido desde features/catalogo/utils)
src/app/shared/ui/resource-state/   # app-resource-state (antes catalogo-state)
src/app/shared/ui/input/            # + type 'number'

src/app/features/proveedor/
  index.ts                          # solo PROVEEDOR_ROUTES
  proveedor.routes.ts
  models/proveedor.types.ts
  services/proveedor-api.ts         # getMyStore, createStore, listMyProducts, getMyProduct, createProduct,
                                    # updateProduct, createVariant, updateVariant, setStock,
                                    # listSubOrders, getSubOrder
  utils/ficha-tecnica.ts            # FichaRow[] <-> Record, validación (claves únicas, límites)
  utils/product-validation.ts       # límites de longitud y reglas de precio y stock
  components/store-form/
  components/product-form/          # compartido por nuevo y editar
  components/ficha-tecnica-editor/
  components/variant-editor/        # una presentación: datos, oferta, activo y stock
  components/variant-create-form/
  components/stock-summary/         # stock total, reservado y disponible
  components/sub-order-items/       # tabla de ítems del sub-pedido
  pages/mi-tienda/
  pages/mis-productos/
  pages/producto-nuevo/
  pages/producto-editar/
  pages/pedidos-recibidos/
  pages/pedido-recibido/
```

Convenciones:

- Los precios son enteros positivos en COP y se muestran con `formatCop` (de `core/catalog`). `precioOferta`, si existe, es menor que `precio`; el formulario lo valida y el backend sigue siendo la autoridad.
- El stock se envía como valor absoluto (entero mayor o igual a 0). El formulario de stock usa como mínimo `stockReservado` de la presentación; si el backend responde `409` se muestra su `message`.
- Límites de texto (se validan en el cliente solo como ayuda de UX): tienda `nombre` 1 a 120, `nit` 1 a 30, `municipio` 1 a 100; producto `nombre` 1 a 200, `marca` 1 a 100; presentación 1 a 100, unidad 1 a 20; ficha técnica hasta 30 entradas, clave 1 a 50, valor hasta 500.
- Las claves de la ficha técnica son únicas (sin distinguir mayúsculas) dentro de un producto.
- `categoryId` se elige de `GET /catalog/categories` (solo categorías activas, vía `CatalogApi`).
- Desactivar un producto o una presentación (`activo = false`) es reversible con la misma casilla, sin diálogo de confirmación. Una presentación inactiva sigue en la lista del proveedor, marcada con el badge "Inactiva".
- Tras crear la tienda, si el refresh falla, la tienda queda creada y se muestra un aviso: "Tu tienda se creó, pero no se pudo actualizar la sesión. Vuelve a iniciar sesión para ver tus pedidos".
- Fechas con `Intl.DateTimeFormat('es-CO')`, en un helper local de la feature.
- `features/proveedor` solo importa de `core/*` y `shared/ui`, nunca de otra feature. Dirección de dependencias de la SPEC 04 sin cambios (`core/catalog` solo depende de `core/http`).

## Plan de implementación

Cada paso deja la app compilando, con `ng test` en verde y `ng build` sin errores. Antes de crear o ampliar cualquier `app-*` se invoca la skill `ui-component`; el diseño visual sigue `frontend-design` y `web-design-guidelines`. La spec se implementa **después de cerrar la SPEC 05**.

1. **Contrato y línea base.** Con el backend levantado y la ruta `my-store/products` ya disponible, verificar con el navegador o `curl` la forma real de cada endpoint (incluido `404` sin tienda en `my-store` y `my-store/products`, `409` de tienda duplicada y de stock bajo lo reservado) y ajustar "Modelo de datos" si difiere. Si `GET /catalog/my-store/products` no existe, detener la spec y avisar. Anotar el número de tests de `ng test` y los chunks lazy de `ng build`.
2. **Mover lo compartido (refactor sin cambio de comportamiento).** Con `git mv`: `features/catalogo/services/catalogo-api.ts` (con su spec) a `core/catalog/services/catalog-api.ts` y clase `CatalogApi`; los tipos `ProductsFilter`, `StoresFilter`, `CATALOGO_PAGE_SIZE` y `STORE_LOOKUP_LIMIT` a `core/catalog/models/`; `resource-error.ts` (con su spec) a `core/http/utils/resource-api-error.ts`. Con la skill `ui-component`, `catalogo-state` pasa a `shared/ui/resource-state/` como `app-resource-state` con demo `/ui/resource-state`. Exportar lo público desde los `index.ts` y ajustar los imports y specs de `features/catalogo`. `ng test` debe dar el mismo número de tests que la línea base.
3. **`app-input` numérico.** Con la skill `ui-component`: `type="number"` con `min`, `max` y `step`, valor numérico (`null` si está vacío), compatible con Signal Forms, sin flechas del navegador que cambien el valor con la rueda. Spec y demo `/ui/input` ampliados.
4. **`ProveedorApi`, tipos y utilidades.** Crear `models/proveedor.types.ts`, `services/proveedor-api.ts` (solo se envían los params y campos con valor; errores como `ApiError`), `utils/ficha-tecnica.ts` y `utils/product-validation.ts`, con specs. `ProveedorApi` con `HttpTestingController`: URLs, métodos, cuerpos (`precioOferta: null`, sin `storeId`), propagación de `ApiError`. `ficha-tecnica`: filas a Record y viceversa, clave vacía, clave repetida con otra capitalización, más de 30 entradas, valor de 501 caracteres. `getMyProduct(id)` recorre `my-store/products` con `limit=100` hasta encontrar el id y devuelve `404` si no está.
5. **Mi tienda.** Crear `components/store-form/` y `pages/mi-tienda/`: carga `GET /catalog/my-store`; `404` muestra el formulario; con tienda muestra la ficha y el aviso de tienda desactivada. Tras crear, llama a `SessionRefresher.refresh()` y muestra la ficha. Sustituir el `loadComponent` de `tienda`.
6. **Mis productos.** Crear `components/stock-summary/` y `pages/mis-productos/` con `app-table`, `app-pagination` y estados, y página en la URL (`?page=`). Sin tienda: estado vacío con enlace a `/proveedor/tienda`. Con la tienda desactivada, el botón Nuevo producto va deshabilitado. Sustituir el `loadComponent` de `productos`.
7. **Alta de producto.** Crear `components/ficha-tecnica-editor/`, `components/product-form/` (Signal Form con `nombre`, `marca`, `categoryId`, `requiresQuote` y la ficha) y `pages/producto-nuevo/`. Al crear, redirige a `/proveedor/productos/:id`. Sustituir el `loadComponent` de `productos/nuevo`.
8. **Edición de producto y presentaciones.** Crear `components/variant-editor/`, `components/variant-create-form/` y `pages/producto-editar/`: reutiliza `product-form` con `activo`, lista cada presentación con su editor (datos y stock en dos formularios independientes) y el alta de presentaciones. Cada guardado actualiza solo la fila afectada con la respuesta del backend. Producto ajeno o inexistente: `404`. Sustituir el `loadComponent` de `productos/:id`.
9. **Pedidos recibidos.** Crear `components/sub-order-items/`, `pages/pedidos-recibidos/` (paginado) y `pages/pedido-recibido/`. Sustituir los `loadComponent` de `pedidos` y `pedidos/:id`.
10. **Cierre.** Actualizar `route-map.spec.ts` si hace falta y `CLAUDE.md` (árbol: `core/catalog/services`, `core/http/utils`, `shared/ui/resource-state`, lista de componentes; "el resto de pantallas siguen siendo placeholders hasta la SPEC 07"). Recorrido manual completo contra el backend con un proveedor real y revisión AXE.

## Criterios de aceptación

- [ ] `/proveedor/tienda`, `/proveedor/productos`, `/proveedor/productos/nuevo`, `/proveedor/productos/:id`, `/proveedor/pedidos` y `/proveedor/pedidos/:id` ya no muestran el placeholder, y un `PRODUCTOR` o `ADMIN` que las abre ve `/acceso-denegado`.
- [ ] Un proveedor sin tienda ve el formulario de creación en `/proveedor/tienda`; con datos válidos se crea y la pantalla pasa a mostrar la ficha.
- [ ] Crear una tienda con NIT repetido o cuando ya se tiene una muestra el mensaje `409` del backend y conserva lo escrito.
- [ ] Justo después de crear la tienda, `/proveedor/pedidos` responde con la tienda del proveedor (el access token ya trae `storeId`) sin cerrar sesión; se verifica con una petición `POST /auth/refresh` en la pestaña de red.
- [ ] Si el refresh posterior a crear la tienda falla, se muestra el aviso de volver a iniciar sesión y la tienda sigue visible.
- [ ] Una tienda con `activa = false` muestra el aviso de tienda desactivada y el botón Nuevo producto deshabilitado.
- [ ] `/proveedor/productos` lista activos e inactivos, con badge "Inactivo" en los inactivos, paginación y `?page=` en la URL que sobrevive a recargar.
- [ ] Sin tienda, `/proveedor/productos`, `/proveedor/productos/nuevo` y `/proveedor/productos/:id` muestran el estado "Aún no tienes una tienda" con enlace a crearla, no una pantalla en blanco.
- [ ] El formulario de producto valida en el cliente nombre, marca, categoría y ficha técnica (claves únicas, hasta 30 entradas, 50 y 500 caracteres) y no envía si algo falla.
- [ ] Crear un producto válido redirige a `/proveedor/productos/:id` y el producto aparece en la lista.
- [ ] La ficha técnica permite agregar, editar y quitar filas, y lo guardado se ve igual al reabrir el producto.
- [ ] En el editor, cada presentación muestra stock total, reservado y disponible, y su estado.
- [ ] Crear una presentación válida la agrega a la lista sin recargar la página; con `precioOferta` mayor o igual a `precio` el formulario no se envía.
- [ ] Editar el precio de oferta y quitarla envía `precioOferta: null` y la presentación deja de mostrar la oferta.
- [ ] Desactivar y reactivar un producto o una presentación con su casilla "Activo" funciona sin recargar y el cambio aparece en `/catalogo` solo cuando está activo.
- [ ] Fijar el stock envía un valor absoluto; con un valor por debajo de lo reservado el formulario lo impide y, si el backend responde `409`, se muestra su mensaje.
- [ ] Tras guardar el stock, la fila muestra el `stock` y el `disponible` devueltos por el backend.
- [ ] Un id de producto ajeno, inexistente o con formato inválido en `/proveedor/productos/:id` muestra "Producto no encontrado" con enlace a la lista.
- [ ] `/proveedor/pedidos` lista los sub-pedidos pagados con fecha y subtotal, paginados, y no muestra comprador ni total del pedido; sin pedidos muestra el estado vacío.
- [ ] `/proveedor/pedidos/:id` muestra los ítems con nombre, presentación, precio unitario, cantidad y subtotal; un id ajeno o inexistente muestra `404` amigable.
- [ ] Todos los precios y subtotales se muestran con `formatCop`.
- [ ] Con el backend apagado, cada pantalla muestra "No se pudo conectar con el servidor" con Reintentar, y un envío de formulario muestra el error sin perder los datos.
- [ ] Un envío de formulario en curso deshabilita el botón y no permite un segundo envío; si falla, el botón vuelve a quedar activo.
- [ ] `app-input` con `type="number"` entrega un número (o `null` vacío), muestra su error accesible y tiene demo funcional en ambos temas.
- [ ] `app-resource-state` tiene demo en `/ui/resource-state` y `/catalogo` sigue mostrando sus estados de carga, error y vacío igual que antes.
- [ ] `CatalogApi` vive en `core/catalog/services/`, `resourceApiError` en `core/http/utils/` y ninguna feature importa de otra: `grep -rnE "from '(\.\./)+(auth|cuenta|catalogo|pedidos|pagos|admin)(/|')" src/app/features/proveedor` devuelve vacío.
- [ ] Ningún `import` estático apunta a un archivo interno de otro módulo (regla de la SPEC 04) y ningún `index.ts` usa `export *`.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] Las seis pantallas no tienen violaciones AXE en claro ni en oscuro, los errores de formulario se anuncian a lectores de pantalla, todo se maneja con teclado y a 360, 768 y 1280 px no hay scroll horizontal de página.
- [ ] Los chunks lazy de las seis pantallas aparecen por separado en la salida de `ng build`.
- [ ] `ng test` pasa con más tests que la línea base del paso 1 y `npm run build` termina sin errores ni avisos nuevos.
- [ ] `CLAUDE.md` refleja los módulos movidos, `app-resource-state` y el estado de los placeholders restantes.

## Decisiones tomadas y descartadas

- **Sí:** esperar la ruta `GET /catalog/my-store/products` del backend (activos e inactivos, con variantes, `stock` y `stockReservado`) y construir sobre ella. Sin ella un proveedor no podría ver ni reactivar un producto desactivado ni conocer lo reservado.
- **No:** limitación documentada solo en frontend, ni guardar los desactivados en `localStorage`. La primera deja una acción sin vuelta atrás; lo segundo mezcla estado del servidor con el del navegador.
- **Sí:** desactivar y reactivar con una casilla, sin diálogo de confirmación. Con la ruta nueva es reversible, y evita crear un `app-dialog` que esta spec no necesita.
- **Sí:** `getMyProduct(id)` lee el producto recorriendo `my-store/products` (`limit=100`) hasta encontrarlo. Es la única fuente con presentaciones inactivas y stock. Un `GET /catalog/my-store/products/:id` sería mejor y queda como mejora del backend.
- **No:** guardar en memoria el producto de la lista al navegar a la edición. Falla al recargar o abrir un enlace directo.
- **Sí:** el alta de producto crea solo el producto y redirige a su edición para agregar presentaciones. Son dos llamadas no atómicas; así cada paso es una llamada y no hay estados a medias.
- **No:** un solo formulario con producto y presentaciones iniciales. Obliga a un reintento parcial si falla una presentación.
- **Sí:** forzar un `POST /auth/refresh` tras crear la tienda. El `storeId` del token solo cambia al renovar, y los pedidos recibidos dependen de él.
- **No:** pedir que se vuelva a iniciar sesión. Mala experiencia y obliga a cerrar sesión a mano; solo queda como mensaje si el refresh falla.
- **Sí:** mover `CatalogApi` a `core/catalog`, `resourceApiError` a `core/http` y el estado de carga a `shared/ui/resource-state` antes de construir proveedor. Una feature no puede importar de otra, y estas piezas ya las necesitan dos features (y luego 07 a 09).
- **No:** duplicar `listCategories` en `ProveedorApi`. Dos clientes para el mismo endpoint divergen con el tiempo.
- **Sí:** renombrar la clase a `CatalogApi` al moverla. El nombre `CatalogoApi` pertenecía a la feature; en `core/catalog` debe coincidir con el módulo. Es la única excepción a "los nombres no cambian al mover" de la SPEC 04, que era un refactor sin lógica nueva.
- **Sí:** formularios de stock y de datos de la presentación separados. Los endpoints son distintos y el de stock tiene su propio error (`409`).
- **Sí:** el stock se pide como valor absoluto, con mínimo `stockReservado`. Es lo que acepta el backend y el cliente ya conoce lo reservado.
- **No:** ajuste de stock por delta (+/-). El backend no lo ofrece.
- **Sí:** `type="number"` como ampliación de `app-input` en `shared/ui`. Precio y stock son numéricos; sin él habría validación manual de texto en cada formulario.
- **No:** un componente `app-number-input` aparte. Duplicaría etiqueta, ayuda y error ya resueltos en `app-input`.
- **Sí:** editor de ficha técnica como componente de la feature. Hoy solo lo usa el producto.
- **Sí:** sub-pedidos en solo lectura y sin comprador ni total, tal como los entrega el backend.
- **Sí:** `PROVEEDOR_PAGE_SIZE = 10`. Son tablas con acciones y varias columnas; 10 filas caben sin scroll largo en móvil.
- **Sí:** la validación del cliente es ayuda de UX; el backend sigue siendo la autoridad.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La ruta `my-store/products` aún no está commiteada o cambia de forma | El paso 1 la verifica y detiene la spec si no existe; el modelo se ajusta a la respuesta real. |
| `getMyProduct` recorre varias páginas si hay muchos productos | `limit=100` y detención al encontrarlo; el caso normal es una sola petición. Mejora de backend propuesta. |
| El access token trae un `storeId` viejo y los pedidos salen vacíos | Refresh forzado al crear la tienda y criterio de aceptación sobre la petición `POST /auth/refresh`. |
| El refresh forzado revoca la sesión si se reutiliza un token rotado | Se usa `SessionRefresher`, que ya comparte el refresh en la pestaña y usa `navigator.locks` entre pestañas. |
| Mover `CatalogApi`, `resourceApiError` y el estado de carga rompe imports y specs de la SPEC 05 | Paso 2 aislado como refactor puro, con `ng test` con el mismo número de tests y `ng build` en verde antes de seguir. |
| Dos pestañas editan la misma presentación | Cada guardado actualiza la fila con la respuesta del backend; no hay bloqueo optimista, queda fuera de alcance. |
| Signal Forms con una lista dinámica de filas (ficha técnica) es incómodo | El editor expone `FichaRow[]` como `model()` y se valida con `utils/ficha-tecnica.ts`, sin depender de arreglos de Signal Forms; se consulta `search_documentation` del MCP de Angular antes del paso 7. |
| El producto o la presentación se desactiva sin querer | La casilla es reversible y muestra el estado con un badge visible. |
| Un proveedor pendiente, rechazado o deshabilitado no puede iniciar sesión | Sin cambio: lo resuelve la SPEC 03; esta spec no necesita manejar esos estados. |

## Lo que **no** está en esta spec

- Editar o desactivar la tienda desde el proveedor (administración, SPEC 09).
- Borrar productos o presentaciones, imágenes, carga masiva y ajustes de stock por delta.
- Despachar, cambiar el estado de un sub-pedido o ver al comprador y el total.
- Categorías (SPEC 09), carrito, checkout y pagos (SPEC 07 y 08).
- Un `GET /catalog/my-store/products/:id` y cualquier otro cambio en el backend.
- Tests e2e e internacionalización.

Cada uno de estos, si se aborda, va en su propio spec.
