# SPEC 05 — Módulo Catálogo público: productos, ofertas y tiendas

> **Status:** Implementado
> **Depends on:** SPEC 02, SPEC 03, SPEC 04
> **Date:** 2026-11-08
> **Objective:** Reemplazar los cinco placeholders de `/catalogo` por pantallas reales conectadas a los endpoints públicos `GET /catalog/*` del backend (listado de productos, detalle de producto, ofertas, tiendas y detalle de tienda), con filtros y paginación en la URL.

---

## Por qué existe esta spec

El encargo es implementar en el frontend todos los módulos de `agro-app-workspace` que faltan tras Auth. Son unas 30 pantallas en cinco dominios, demasiado para una sola spec (toca más de tres áreas y exige decisiones en cuatro o más dominios), así que se parte en cinco specs por dominio, cada una con la app funcional al cerrar:

| Spec | Dominio | Pantallas |
| --- | --- | --- |
| **05** (esta) | Catálogo público | `/catalogo`, `/catalogo/productos/:id`, `/catalogo/ofertas`, `/catalogo/tiendas`, `/catalogo/tiendas/:id` |
| 06 | Proveedor | tienda, productos, presentaciones, stock, sub-pedidos recibidos |
| 07 | Carrito, checkout y pedidos | `/carrito`, `/checkout`, `/pedidos…` (incluye el botón "Agregar al carrito" del detalle de producto) |
| 08 | Pagos | `/pedidos/:id/pago`, `/pagos…` |
| 09 | Administración | usuarios, categorías, tiendas, pedidos y pagos en solo lectura |

El catálogo va primero porque es la única parte pública (la ve el visitante), porque 06 y 07 reutilizan sus tipos y porque obliga a crear los componentes base de listados (paginación, tarjetas).

Las reglas de negocio de referencia son `docs/reglas-de-negocio.md` del backend, sección "Catálogo". Contrato verificado en `apps/api/src/modules/catalog/controllers/catalog-public.controller.ts` el 2026-11-08. Tres limitaciones del backend condicionan el diseño:

- El listado `GET /catalog/products` **no incluye precios ni presentaciones**; solo el detalle los trae.
- `GET /catalog/offers` devuelve **presentaciones** sin el nombre del producto (solo `productId`).
- `GET /catalog/stores/:id` devuelve solo `nombre` y `municipio`; los productos de una tienda salen de `GET /catalog/products?storeId=`.

No hay búsqueda por texto ni imágenes de producto en el backend. Ninguna de las dos cosas es parte de esta spec.

## Alcance

**Dentro:**

- **Listado `/catalogo`:** tarjetas de producto (nombre, marca, categoría, tienda y badge "A cotizar" si `requiresQuote`), filtros por categoría y municipio, y paginación.
- **Detalle `/catalogo/productos/:id`:** datos del producto, ficha técnica, tabla de presentaciones con precio vigente, precio tachado si hay oferta y disponibilidad, enlace a la tienda y aviso "Inicia sesión para comprar" para el visitante. Un producto a cotizar muestra "Precio a cotizar" y no ofrece compra.
- **Ofertas `/catalogo/ofertas`:** presentaciones con precio de oferta; por cada `productId` distinto de la página se consulta el producto una sola vez para mostrar nombre y enlace.
- **Tiendas `/catalogo/tiendas`:** directorio con filtro por municipio y paginación.
- **Detalle de tienda `/catalogo/tiendas/:id`:** nombre, municipio y sus productos (`GET /catalog/products?storeId=`) con paginación.
- **Filtros y página en la URL** como query params (`categoryId`, `municipio`, `page`), de modo que se pueden compartir, funciona Atrás y recargar conserva el estado.
- **Estados** en cada pantalla: cargando, vacío, error de red o servidor (con botón Reintentar) y `404` (producto o tienda inexistente, inactiva o con id inválido).
- **Nuevo módulo `core/catalog/`** con los tipos de catálogo y `formatCop`, compartidos por las specs 06 y 07 (una feature no puede importar de otra).
- **`CatalogoApi`** en `features/catalogo/services/`, sobre `HttpClient` y con `httpResource` o señales en las pantallas, sin librerías nuevas.
- **Componente UI nuevo `app-pagination`**, creado con la skill `ui-component`, con demo en `/ui/pagination`.
- Sustituir los `loadComponent` de las cinco rutas conservando `title` y `data` (`RouteInfo`).
- Actualizar `CLAUDE.md` (módulo `core/catalog`, lista de componentes y mención de la SPEC 06) y `route-map.spec.ts` si hace falta.

**Fuera de alcance (otras specs):**

- Botón "Agregar al carrito" y todo el carrito, checkout y pedidos (SPEC 07).
- Crear o editar tiendas, productos, presentaciones y stock (SPEC 06) y categorías o tiendas de administración (SPEC 09).
- Búsqueda por texto, ordenamiento y filtro por rango de precio: el backend no los ofrece.
- Imágenes de producto: no existen en el modelo. Las tarjetas usan un `app-icon` decorativo.
- Pedir al backend que el listado incluya precio mínimo (requeriría una spec en `agro-app-workspace`).
- Caché compartida de categorías entre pantallas, scroll infinito, favoritos y comparador.
- Notificaciones (`apps/notifications` no tiene interfaz).
- Tests e2e e internacionalización.

## Modelo de datos

```ts
// src/app/core/catalog/models/catalog.types.ts  (espejo de las vistas públicas del backend)
export interface Page<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  nombre: string;
  marca: string;
  fichaTecnica: Record<string, string>;
  requiresQuote: boolean;
  activo: boolean;
}

export interface PublicVariant {
  id: string;
  productId: string;
  presentacion: string;
  unidad: string;
  precio: number; // entero en COP
  precioOferta?: number; // menor que `precio`
  precioVigente: number;
  disponible: number; // stock - stockReservado; 0 se muestra, no se oculta
}

export interface ProductDetail extends Product {
  variantes: PublicVariant[];
}

export interface PublicStore { id: string; nombre: string; municipio: string }
export interface PublicCategory { id: string; nombre: string }

// src/app/features/catalogo/models/catalogo.types.ts
export interface ProductsFilter { categoryId?: string; storeId?: string; municipio?: string; page: number }
export interface StoresFilter { municipio?: string; page: number }
export const CATALOGO_PAGE_SIZE = 12; // se envía como `limit`; el backend admite 1 a 100 (20 por defecto)
```

```text
src/app/core/catalog/
  index.ts                         # Page, Product, ProductDetail, PublicVariant, PublicStore, PublicCategory, formatCop
  models/catalog.types.ts
  utils/format-cop.ts              # 25000 -> "$ 25.000" con Intl.NumberFormat('es-CO', COP, sin decimales)

src/app/features/catalogo/
  index.ts                         # solo CATALOGO_ROUTES
  catalogo.routes.ts
  models/catalogo.types.ts
  services/catalogo-api.ts         # listProducts, getProduct, listOffers, listStores, getStore, listCategories
  utils/filter-params.ts           # query params <-> ProductsFilter / StoresFilter (valida id, municipio y page)
  components/product-card/         # tarjeta de producto (con su spec)
  components/store-card/
  components/variants-table/       # presentaciones de un producto
  components/catalogo-filters/     # categoría y municipio con app-select y app-input
  components/catalogo-state/       # cargando, error con Reintentar y vacío
  pages/catalogo-list/
  pages/producto-detalle/
  pages/ofertas/
  pages/tiendas/
  pages/tienda-detalle/

src/app/shared/ui/pagination/      # pagination.ts, pagination.types.ts, pagination.spec.ts, pagination-demo.ts
```

Convenciones:

- Solo se crean las carpetas que tienen contenido; los specs van junto a su archivo (SPEC 04).
- Los precios son enteros en COP; se muestran siempre con `formatCop`. Nunca se calcula un total ni se redondea en el cliente.
- El precio mostrado es `precioVigente`; si `precioOferta` existe se muestra además `precio` tachado, con el texto accesible "Precio anterior".
- `disponible = 0` se muestra como badge "Sin stock" y la presentación no se oculta.
- Query params: `categoryId` y `storeId` solo se aceptan si son 24 caracteres hexadecimales; `municipio` se recorta y se limita a 100 caracteres; `page` es un entero mayor o igual a 1. Cualquier valor inválido se ignora (no rompe la pantalla). Cambiar un filtro reinicia `page` a 1.
- Las rutas ya existentes no cambian: `/catalogo`, `/catalogo/productos/:id`, `/catalogo/ofertas`, `/catalogo/tiendas` y `/catalogo/tiendas/:id`, todas con `roles: ALL_ROLES`.
- Errores: `404` en detalle muestra `app-empty-state` "Producto no encontrado" o "Tienda no encontrada" con enlace al listado; `status 0` muestra "No se pudo conectar con el servidor"; cualquier otro código muestra el `message` de `ApiError`. Todos con `app-alert` y botón Reintentar, y anunciados con `role="alert"`.
- Dependencia nueva en la regla de la SPEC 04: `core/catalog` depende solo de `core/http` y no de `auth`, `navigation`, `routing` ni `layout`.

## Plan de implementación

Cada paso deja la app compilando, con `ng test` en verde y `ng build` sin errores. Antes de crear `app-pagination` se invoca la skill `ui-component`; el diseño visual sigue `frontend-design` y `web-design-guidelines`. Antes de empezar se lee el paso 1 con el backend levantado.

1. **Contrato y línea base.** Con el backend corriendo, verificar con `curl` o el navegador la forma real de `GET /catalog/products`, `/products/:id`, `/offers`, `/stores`, `/stores/:id` y `/categories` (campos, `page`/`limit`, `404` e id inválido) y ajustar "Modelo de datos" si difiere. Anotar el número de tests de `ng test` y la lista de chunks lazy de `ng build`.
2. **`core/catalog`.** Crear `models/catalog.types.ts`, `utils/format-cop.ts` con su spec y `index.ts` con exportaciones nombradas (sin `export *`). Spec de `formatCop`: `0`, `1000`, `25000`, `1234567`.
3. **`app-pagination`.** Con la skill `ui-component`: componente con `page` (`model`), `totalPages`, `ariaLabel`, botones anterior y siguiente, números de página con elipsis, `aria-current="page"` en la actual y deshabilitado en los extremos. Oculto si `totalPages <= 1`. Spec y demo `/ui/pagination` (ruta nueva en `app.routes.ts`). Solo este componente puede importar Material o CDK, si lo necesita.
4. **`CatalogoApi` y `filter-params`.** Crear `services/catalogo-api.ts` (`inject(HttpClient)` y `API_BASE_URL`; sin `Authorization`, el interceptor ya lo omite si no hay sesión) y `utils/filter-params.ts` con specs. Casos: ids inválidos, `page` `0`, `-1`, `abc` y `1.5`, `municipio` vacío y de 200 caracteres. Test de `CatalogoApi` con `HttpTestingController`: URL, query params y propagación de `ApiError`.
5. **Componentes de presentación.** Crear `product-card`, `store-card`, `variants-table`, `catalogo-filters` y `catalogo-state` con sus specs, usando solo `app-*` (`app-card`, `app-badge`, `app-icon`, `app-button`, `app-select`, `app-input`, `app-table`, `app-alert`, `app-empty-state`).
6. **Listado `/catalogo`.** Crear `pages/catalogo-list/`: carga categorías y productos, lee y escribe filtros y página en la URL, y muestra los estados. Sustituir el `loadComponent` de la ruta vacía. Probar en el navegador con filtros, Atrás y recarga.
7. **Detalle de producto.** Crear `pages/producto-detalle/` con ficha técnica, `variants-table`, nombre de tienda enlazado (se consulta `GET /catalog/stores/:id`; si falla, se muestra solo el enlace "Ver tienda") y aviso "Inicia sesión para comprar" para el visitante. Sustituir el `loadComponent` de `productos/:id`.
8. **Tiendas.** Crear `pages/tiendas/` y `pages/tienda-detalle/` (productos con `storeId` y paginación). Sustituir los `loadComponent` de `tiendas` y `tiendas/:id`.
9. **Ofertas.** Crear `pages/ofertas/`: lista las presentaciones y consulta `GET /catalog/products/:id` una vez por `productId` distinto de la página, en paralelo, para mostrar nombre y enlace. Si una consulta falla, esa fila queda con la presentación, el precio y el enlace sin nombre. Sustituir el `loadComponent` de `ofertas`.
10. **Cierre.** Exportar `CATALOGO_ROUTES` desde `features/catalogo/index.ts` (ya existe), actualizar `route-map.spec.ts` si hace falta y `CLAUDE.md` (árbol con `core/catalog`, dirección de dependencias, lista de componentes con `app-pagination`, y "el resto de pantallas siguen siendo placeholders hasta la SPEC 06"). Recorrido manual completo contra el backend y revisión AXE.

## Criterios de aceptación

- [ ] `/catalogo`, `/catalogo/productos/:id`, `/catalogo/ofertas`, `/catalogo/tiendas` y `/catalogo/tiendas/:id` ya no muestran el placeholder y siguen accesibles para visitante, productor, proveedor y administrador.
- [ ] El listado muestra los productos reales del backend con nombre, marca, categoría y tienda, y no muestra precios.
- [ ] Un producto con `requiresQuote` muestra el badge "A cotizar" en el listado y "Precio a cotizar" en el detalle, y no ofrece compra.
- [ ] Filtrar por categoría o municipio actualiza la URL (`?categoryId=…&municipio=…`), reinicia `page` a 1 y recargar la página conserva filtros y página.
- [ ] El botón Atrás del navegador restaura el filtro y la página anteriores.
- [ ] `?page=0`, `?page=abc`, `?categoryId=xyz` y `?municipio=` (vacío) no rompen la pantalla y se tratan como sin valor.
- [ ] Con una página fuera de rango (`?page=999`) se muestra el estado vacío con enlace para volver a la primera página.
- [ ] `app-pagination` no se muestra con una sola página, marca la página actual con `aria-current="page"`, deshabilita anterior en la primera y siguiente en la última, y se maneja con teclado.
- [ ] El detalle de producto muestra la ficha técnica, cada presentación con unidad y precio vigente, el precio anterior tachado cuando hay oferta y "Sin stock" cuando `disponible = 0`.
- [ ] Todos los precios se muestran con `formatCop` (por ejemplo `$ 25.000`), sin decimales.
- [ ] El visitante ve "Inicia sesión para comprar" en el detalle y el aviso enlaza a `/auth/login?returnUrl=<ruta del producto>`; un usuario con sesión no lo ve.
- [ ] Ninguna pantalla de esta spec muestra un botón "Agregar al carrito".
- [ ] `/catalogo/ofertas` hace una sola consulta de producto por cada `productId` distinto de la página y muestra el nombre del producto en cada fila.
- [ ] Si falla la consulta de un producto en ofertas, la fila se sigue mostrando con la presentación y el precio.
- [ ] El detalle de tienda muestra nombre, municipio y sus productos paginados.
- [ ] Un id inexistente o con formato inválido en producto o tienda muestra "Producto no encontrado" o "Tienda no encontrada" con enlace al listado, y no una pantalla en blanco.
- [ ] Con el backend apagado, cada pantalla muestra "No se pudo conectar con el servidor" con un botón Reintentar que recarga los datos al volver el backend.
- [ ] Durante la carga cada pantalla muestra un estado de carga con `aria-busy="true"` y no salta de tamaño de forma brusca al llegar los datos.
- [ ] Ninguna petición de esta spec lleva cabecera `Authorization` cuando no hay sesión, y con sesión iniciada las pantallas funcionan igual.
- [ ] `core/catalog` solo importa de `core/http`, y ninguna feature importa de otra feature: `grep -rnE "from '(\.\./)+(auth|cuenta|pedidos|pagos|proveedor|admin)(/|')" src/app/features/catalogo` devuelve vacío.
- [ ] Ningún `import` estático apunta a un archivo interno de otro módulo (regla de la SPEC 04) y ningún `index.ts` usa `export *`.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] `app-pagination` tiene demo funcional en `/ui/pagination` en claro y oscuro y no expone tipos de Material ni de CDK.
- [ ] Las cinco pantallas no tienen violaciones AXE en claro ni en oscuro, y a 360, 768 y 1280 px no hay scroll horizontal de página.
- [ ] Los chunks lazy de las cinco pantallas de catálogo aparecen por separado en la salida de `ng build`, sin reexportarlas desde ningún `index.ts`.
- [ ] `ng test` pasa con más tests que la línea base y `npm run build` termina sin errores ni avisos nuevos.
- [ ] `CLAUDE.md` refleja `core/catalog`, `app-pagination` y el estado de los placeholders restantes.

## Decisiones tomadas y descartadas

- **Sí:** partir el encargo en cinco specs por dominio (05 a 09) y redactar primero el catálogo. Una sola spec rompería el límite de tamaño y sería imposible de revisar o commitear por partes. El catálogo es lo único público y lo reutilizan las demás.
- **No:** dos o tres specs más grandes (oferta, compra y administración). Menos documentos pero cada uno con más de 10 pasos y varios dominios.
- **Sí:** tarjeta del listado sin precio, el precio se ve en el detalle. El backend no lo envía y evita hasta 20 peticiones extra por página.
- **No:** cargar el detalle de cada tarjeta para mostrar "desde $X". Mejor vista, pero N+1, más estados de carga y más fallos parciales.
- **No:** pedir ahora un cambio al backend para incluir el precio mínimo. Está en otro repositorio; queda como mejora futura propia.
- **Sí:** en ofertas, consultar cada producto distinto una vez para mostrar su nombre. El listado de ofertas por sí solo no dice qué se vende.
- **No:** mostrar solo "Presentación 1 L" con enlace. Sin peticiones extra, pero el usuario no sabría qué producto es.
- **Sí:** dejar el botón "Agregar al carrito" para la SPEC 07 y en esta spec avisar al visitante de que debe iniciar sesión. Un botón sin función o deshabilitado confunde y no hay carrito que alimentar.
- **Sí:** filtros y página en la URL. Se pueden compartir y Atrás y recarga funcionan sin código adicional de persistencia.
- **No:** señales locales para los filtros. Más simple, pero se pierden al recargar o navegar.
- **Sí:** un servicio `CatalogoApi` por feature con `httpResource` o señales, sin librerías nuevas. Es el mismo patrón que `AuthApi` y respeta los módulos por dominio de la SPEC 04.
- **No:** cliente API central en `core/http` ni librerías de estado (NgRx, TanStack Query). El primero rompe la idea de módulos por dominio; las segundas suman una dependencia para pantallas de solo lectura.
- **Sí:** los tipos de catálogo y `formatCop` van a `core/catalog/`. Los usarán 06 y 07, y una feature no puede depender de otra (SPEC 04).
- **No:** permitir importar entre features por `index.ts` ni duplicar los tipos. Lo primero cambia la regla de la SPEC 04 y abre ciclos; lo segundo deja que los contratos diverjan.
- **Sí:** `CatalogoApi` y los componentes de catálogo se quedan en `features/catalogo/`. Hoy solo los usa el catálogo; si 06 o 07 los necesitan, se mueven a `core/catalog` o `shared/ui` en esa spec.
- **Sí:** `app-pagination` como componente de `shared/ui`. Lo necesitan casi todos los listados de las specs 06 a 09 y debe seguir la regla de que solo `shared/ui` conoce Material y CDK.
- **Sí:** `CATALOGO_PAGE_SIZE = 12`. Encaja en rejillas de 1, 2, 3 y 4 columnas sin dejar filas incompletas; el backend admite hasta 100.
- **No:** imágenes ni búsqueda por texto. El backend no los tiene; añadirlos exige trabajo en el otro repositorio.
- **Sí:** la validación de query params es de UX y el backend sigue siendo la autoridad (rechaza ids inválidos con `400`).

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| La forma real de las respuestas difiere de los tipos asumidos | El paso 1 la verifica con el backend antes de escribir código y se ajusta el modelo. |
| Ofertas con muchos productos distintos disparan hasta 12 peticiones por página | `limit` fijo en 12, consulta única por `productId` y consultas en paralelo; la fila no espera por el nombre. |
| Un fallo en la consulta de un producto de ofertas deja la pantalla incompleta | Criterio de aceptación: la fila se muestra sin nombre y la pantalla no falla. |
| Una página fuera de rango deja la pantalla vacía sin salida | Estado vacío con enlace a la primera página. |
| Los params de la URL provocan peticiones inválidas al backend (`400`) | `filter-params` descarta valores inválidos antes de pedir y tiene tests propios. |
| Resultados que llegan desordenados al cambiar rápido de filtro (carrera) | `httpResource` cancela la petición anterior; se prueba cambiando de filtro con la red lenta. |
| Un `index.ts` arrastra una pantalla lazy al bundle principal | Regla de la SPEC 04: `features/catalogo/index.ts` exporta solo `CATALOGO_ROUTES`; se comparan los chunks con la línea base. |
| Dos pantallas de datos distintas (listado de tiendas y de productos) duplican lógica de filtros | `filter-params` y `catalogo-filters` son compartidos dentro de la feature, con tests. |
| Los componentes nuevos ignoran la estructura de módulos | Criterios de aceptación sobre `grep` de imports y de Material/CDK, igual que en la SPEC 04. |

## Lo que **no** está en esta spec

- Carrito, "Agregar al carrito", checkout y pedidos (SPEC 07).
- Administración de tienda, productos, presentaciones y stock del proveedor (SPEC 06).
- Pagos (SPEC 08) y administración de usuarios, categorías, tiendas, pedidos y pagos (SPEC 09).
- Búsqueda por texto, ordenamiento, rango de precios e imágenes.
- Cambios en el backend (por ejemplo, precio mínimo en el listado).
- Scroll infinito, favoritos, comparador y caché compartida de categorías.
- Tests e2e e internacionalización.

Cada uno de estos, si se aborda, va en su propio spec.
