# SPEC 08 — Módulo Pagos: pagar un pedido con el simulador e historial de pagos

> **Status:** Implementado
> **Depends on:** SPEC 03, SPEC 04, SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-11-08
> **Objective:** Permitir que un `PRODUCTOR` pague un pedido `AWAITING_PAYMENT` con la pasarela simulada (método y token de prueba), vea el resultado hasta que el pedido quede confirmado y consulte su historial de pagos, reemplazando los placeholders de `/pedidos/:id/pago`, `/pagos` y `/pagos/:id`.

---

## Por qué existe esta spec

Es la cuarta de las cinco specs que implementan el resto de módulos del backend (05 Catálogo público, 06 Proveedor, 07 Carrito y pedidos, **08 Pagos**, 09 Administración). Cierra el flujo de compra: la SPEC 07 deja el pedido en `AWAITING_PAYMENT` con un botón **Pagar**, y esta spec es a donde lleva.

Contrato del backend que esta spec consume (verificado el 2026-11-08 en `apps/api/src/modules/payments/controllers/payments.controller.ts`, `services/payments.service.ts` y `docs/reglas-de-negocio.md`, sección "Pagos"):

- `POST /payments` con `{ orderId, metodo: 'CARD' | 'PSE' | 'NEQUI', token }` y el header `Idempotency-Key` (8 a 100 caracteres). El monto lo toma el backend del pedido. Responde `201` en el primer intento (también si el resultado es `DECLINED` o `ERROR`, que van en `status`) y `200` al repetir la misma clave con el mismo cuerpo. La misma clave con otro cuerpo responde `422`.
- La simulación tarda de 1 a 3 segundos y `POST /payments` responde al terminar. Con el token `tok_test_pending` el pago queda en `PROCESSING` y lo resuelve después un webhook firmado (server a server, que el frontend nunca invoca ni conoce su secreto).
- Tokens de prueba: `tok_test_approved` (`APPROVED`), `tok_test_declined` (`DECLINED`, "Fondos insuficientes"), `tok_test_error` (`ERROR`, reintentable), `tok_test_pending` (`PROCESSING`); cualquier otro se rechaza como `DECLINED`.
- Errores de negocio: `409` con `code: 'ORDER_NOT_PAYABLE'` (pedido fuera de `AWAITING_PAYMENT` o vencido), `409` con `code: 'PAYMENT_IN_PROGRESS'` (ya hay un pago `PENDING`, `PROCESSING` o `APPROVED`), `404` (pedido inexistente o ajeno) y `422`.
- `GET /payments?page&limit&status&orderId` lista los pagos propios (más reciente primero) y `GET /payments/:id` devuelve uno (`404` si es ajeno). La vista trae `id`, `orderId`, `monto`, `moneda`, `metodo`, `status`, `referencia?`, `motivoRechazo?` y `createdAt`; nunca la clave de idempotencia ni el token.
- Todo el controlador tiene un límite de **10 peticiones por minuto**: un sondeo frecuente lo agota (ver "Convenciones").
- Un `DECLINED` o `ERROR` deja el pedido en `AWAITING_PAYMENT` y se puede reintentar con una **clave nueva** mientras no venza. Un `payment.approved` confirma el pedido de forma asíncrona, así que tras un pago aprobado el pedido tarda un instante en pasar a `CONFIRMED`.

## Alcance

**Dentro:**

- **`/pedidos/:id/pago`** (`features/pagos`): carga el pedido, muestra monto, estado y cronómetro y, si es pagable, un formulario con **método** (Tarjeta, PSE, Nequi) y **escenario de prueba** (Aprobado, Rechazado, Error de pasarela, Pendiente) rotulado como simulador, más la opción **Otro token** que muestra un campo de texto. Muestra el resultado del pago y los reintentos.
- **Estado de un pago ya existente:** al abrir la pantalla se consulta el último pago del pedido (`GET /payments?orderId=&limit=1`); si está `PROCESSING`, `PENDING` o `APPROVED` se muestra su estado en vez del formulario.
- **Pago pendiente (`PROCESSING`):** se consulta el pago cada 8 segundos hasta que cambie de estado o pasen 2 minutos; después se detiene y ofrece **Actualizar**.
- **Pago aprobado:** se consulta el pedido hasta que pase a `CONFIRMED` (máximo 30 segundos) y entonces se ofrecen los enlaces al pedido y a los pagos.
- **`/pagos`:** historial paginado con filtros por estado y por pedido en la URL (`?status=&orderId=&page=`).
- **`/pagos/:id`:** datos del pago (monto, método, estado, referencia, motivo de rechazo, fecha), enlace a su pedido y, si fue `DECLINED` o `ERROR` y el pedido sigue pagable, enlace **Reintentar pago**. Un pago `PROCESSING` se vuelve a consultar como arriba.
- **Mover a `core/orders/`** lo que ahora usan pedidos y pagos (refactor puro, paso 2): tipos de pedido, `getOrder`, el cronómetro y la insignia de estado.
- **Mover la ruta `/pedidos/:id/pago`** de `features/pedidos` a `features/pagos`, montada en `app.routes.ts` antes de `pedidos`.
- **Ampliar `ApiError`** con `code?: string` (se lee del cuerpo de error del backend) para distinguir los dos `409`.
- `PagosApi` en `features/pagos/`, sobre `HttpClient` y con `rxResource` o señales, sin librerías nuevas.
- Sustituir los `loadComponent` de las tres rutas conservando `title` y `data` (`RouteInfo`).
- Actualizar `CLAUDE.md` y `route-map.spec.ts`.

**Fuera de alcance (otras specs):**

- Pagos de todos los usuarios con historial de intentos para el `ADMIN` (SPEC 09).
- El webhook de la pasarela (`POST /payments/webhook`): es server a server y se autentica por firma; el frontend no lo llama. Resolver a mano un pago `PROCESSING` en desarrollo queda fuera de la app.
- Datos reales de tarjeta, tokenización, 3-D Secure, guardar métodos de pago y pagos parciales: el backend solo admite un token de prueba.
- Reembolsos, facturas y comprobantes descargables: no existen.
- Notificaciones en tiempo real: se usa sondeo acotado solo en un pago `PROCESSING` y tras un pago aprobado.
- Tests e2e e internacionalización.

## Modelo de datos

```ts
// src/app/core/http/models/api-error.ts   (se amplía)
export interface ApiError {
  status: number;
  message: string;
  code?: string; // `code` del cuerpo de error del backend, p. ej. 'ORDER_NOT_PAYABLE'
}

// src/app/features/pagos/models/pagos.types.ts
export type PaymentMethod = 'CARD' | 'PSE' | 'NEQUI';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'DECLINED' | 'ERROR';

export interface Payment {
  id: string;
  orderId: string;
  monto: number; // entero en COP
  moneda: string; // 'COP'
  metodo: PaymentMethod;
  status: PaymentStatus;
  referencia?: string;
  motivoRechazo?: string;
  createdAt: string; // ISO
}
export interface CreatePaymentRequest { orderId: string; metodo: PaymentMethod; token: string }
export interface PaymentsFilter { status?: PaymentStatus; orderId?: string; page: number }

export const PAGOS_PAGE_SIZE = 10;
export const PAYMENT_POLL_INTERVAL_MS = 8000; // el backend limita a 10 peticiones por minuto
export const PAYMENT_POLL_MAX_MS = 2 * 60 * 1000;
export const ORDER_CONFIRM_POLL_INTERVAL_MS = 2000;
export const ORDER_CONFIRM_POLL_MAX_MS = 30 * 1000;
export const CUSTOM_TOKEN_MAX_LENGTH = 100;

// src/app/features/pagos/config/test-scenarios.ts
export interface TestScenario { id: string; label: string; token: string; hint: string }
// 'approved' -> tok_test_approved, 'declined' -> tok_test_declined,
// 'error' -> tok_test_error, 'pending' -> tok_test_pending. `Otro token` no es un escenario: abre el campo libre.
```

Estructura de carpetas (SPEC 04; solo las que tienen contenido):

```text
src/app/core/orders/                # movido desde features/pedidos (SPEC 07)
  index.ts                          # Order, OrderSummary, OrderItem, SubOrder, OrderStatus, OrdersApi (getOrder),
                                    # remainingMs, formatCountdown, orderStatusLabel, OrderCountdown, OrderStatusBadge,
                                    # ORDER_PAYMENT_WINDOW_MS
  models/orders.types.ts
  services/orders-api.ts            # getOrder(id)
  utils/countdown.ts
  utils/order-status.ts
  components/order-countdown/
  components/order-status-badge/

src/app/features/pedidos/           # sigue con checkout, listOrders, carrito, historial y detalle; usa core/orders

src/app/features/pagos/
  index.ts                          # PAGOS_ROUTES y PAGAR_PEDIDO_ROUTES
  pagos.routes.ts
  config/test-scenarios.ts
  models/pagos.types.ts
  services/pagos-api.ts             # createPayment(body, key), listPayments(filter), getPayment(id)
  utils/payment-status.ts           # etiquetas, variante de badge y mensajes de motivo de rechazo
  utils/payment-error.ts            # ApiError -> acción de UX (no pagable, en curso, clave reutilizada, límite, red)
  utils/filter-params.ts            # ?status=&orderId=&page= <-> PaymentsFilter validado
  components/payment-form/
  components/payment-result/        # panel de resultado: aprobado, rechazado, error, procesando
  components/payment-status-badge/
  components/payment-summary/       # monto, método, referencia, fecha
  pages/pagar-pedido/
  pages/mis-pagos/
  pages/pago-detalle/
```

Cambios en lo existente:

- `features/pedidos`: pasa a importar los tipos, `getOrder`, el cronómetro y la insignia desde `core/orders`; el placeholder de `pedidos/:id/pago` sale de `pedidos.routes.ts`; el botón **Pagar** del detalle sigue enlazando a `/pedidos/:id/pago`.
- `app.routes.ts`: nueva entrada `pedidos/:id/pago` con `loadChildren` de `features/pagos` (`PAGAR_PEDIDO_ROUTES`), colocada antes de la que monta `pedidos` en la raíz.
- `core/http`: `ApiError.code` y `toApiError` lo rellena.

Convenciones:

- Los montos son enteros en COP y se muestran con `formatCop`. El monto sale siempre del pedido en el backend; el formulario no tiene campo de monto.
- Nunca se escribe el token, ni la clave, en `localStorage`, `sessionStorage`, URL ni logs. El token enviado es solo el del escenario elegido o el que el usuario escribió en "Otro token".
- **`Idempotency-Key`:** `crypto.randomUUID()` generado al pulsar **Pagar**, en memoria. Se reutiliza si la petición falla sin respuesta (`status 0`) o con `429`, porque el backend responde con el mismo pago si ya la procesó. Se genera una nueva tras un resultado `DECLINED` o `ERROR`, tras `422` y al cambiar el método o el token.
- **Límite de 10 peticiones por minuto:** el sondeo de un pago usa 8 segundos de intervalo (menos de 8 peticiones por minuto) y, si recibe `429`, omite ese ciclo y duplica el intervalo hasta un máximo de 30 segundos. El sondeo del pedido tras un pago aprobado usa `GET /orders/:id`, que no está limitado por este controlador.
- Estados terminales del pago: `APPROVED`, `DECLINED` y `ERROR` (se deja de sondear). `PENDING` y `PROCESSING` se sondean.
- Pagable: pedido en `AWAITING_PAYMENT` con `expiresAt` en el futuro y sin pago `PENDING`, `PROCESSING` o `APPROVED`. Si no es pagable la pantalla lo explica con un `app-empty-state` y un enlace a `/pedidos/:id`.
- Mensajes: `ORDER_NOT_PAYABLE` → "El pedido ya no admite pago"; `PAYMENT_IN_PROGRESS` → "Ya hay un pago en curso para este pedido"; `429` → "Demasiados intentos, espera un minuto"; `status 0` → "No se pudo conectar con el servidor" (con la nota "Si el cobro llegó a procesarse, no se repetirá al reintentar"); `motivoRechazo` conocido → texto en español ("Fondos insuficientes", "Falla de la pasarela, intenta de nuevo"), desconocido → se muestra tal cual.
- El cronómetro se anuncia solo en hitos (SPEC 07). El resultado del pago y los errores se anuncian con `role="status"` o `role="alert"` según el caso, y el foco pasa al panel de resultado al llegar.
- Filtros de `/pagos`: `status` solo acepta los cinco valores; `orderId` solo 24 hex; `page` entero mayor o igual a 1; cualquier otro valor se ignora; cambiar un filtro reinicia `page`.
- Dirección de dependencias (se añade a la SPEC 04): `http` ← `orders`; `features/pedidos` y `features/pagos` usan `core/orders` y nunca se importan entre sí.

## Plan de implementación

Cada paso deja la app compilando, con `ng test` en verde y `ng build` sin errores. Antes de crear o mover cualquier componente `app-*` se invoca la skill `ui-component`; el diseño visual sigue `frontend-design` y `web-design-guidelines`. La spec se implementa **después de cerrar la SPEC 07**.

1. **Contrato y línea base.** Con el backend levantado y un `PRODUCTOR` con un pedido `AWAITING_PAYMENT`, verificar con el navegador o `curl`: `POST /payments` con cada token (`201` y `200` al repetir la clave), el cuerpo de los dos `409` (`code` y `message`), `422`, `429` tras 10 peticiones, el valor real de `motivoRechazo` en un token inválido y en `tok_test_error`, `GET /payments` con y sin `orderId`, y cuánto tarda el pedido en pasar a `CONFIRMED` tras un pago aprobado. Ajustar "Modelo de datos" si difiere. Anotar el número de tests de `ng test` y los chunks lazy de `ng build`.
2. **`ApiError.code`.** Ampliar `ApiError` y `toApiError` (`core/http`) para leer `code` del cuerpo, sin cambiar los demás campos. Spec: `409` con `code`, `409` sin `code`, cuerpo HTML y `status 0`.
3. **Mover a `core/orders` (refactor sin cambio de comportamiento).** Con `git mv`: tipos de pedido, `getOrder` (nuevo `OrdersApi`, con su spec), `utils/countdown.ts`, `utils/order-status.ts`, `order-countdown` y `order-status-badge` desde `features/pedidos` a `core/orders/`, con `index.ts` de exportaciones nombradas (sin `export *`). `PedidosApi` conserva `checkout` y `listOrders` y usa `OrdersApi.getOrder` o lo delega. Ajustar los imports y specs de `features/pedidos`. `ng test` debe dar el mismo número de tests que la línea base.
4. **`PagosApi`, tipos y utilidades.** Crear `models/`, `config/test-scenarios.ts`, `services/pagos-api.ts` (envía `Idempotency-Key`, solo los params con valor; errores como `ApiError`) y `utils/` con specs: `PagosApi` con `HttpTestingController` (URL, método, cuerpo sin monto, cabecera, `200` y `201`), `payment-status` (cada estado y motivo conocido y desconocido), `payment-error` (cada `code`, `422`, `429`, `status 0`) y `filter-params` (valores inválidos).
5. **Componentes de presentación.** Crear `payment-status-badge`, `payment-summary`, `payment-form` (método y escenario con `app-select`, "Otro token" con `app-input`, rótulo de simulador, botón Pagar deshabilitado durante el envío) y `payment-result` (aprobado, rechazado, error, procesando) con sus specs y solo con `app-*`.
6. **Pantalla `/pedidos/:id/pago`.** Crear `pages/pagar-pedido/`: carga pedido y último pago, decide formulario o estado, envía el pago con la clave según las convenciones, muestra el resultado, sondea el pago `PROCESSING` y el pedido tras `APPROVED`. Crear `pagos.routes.ts` con `PAGAR_PEDIDO_ROUTES` (`title`, `data` y `endpoints` que tenía el placeholder), quitar la ruta de `pedidos.routes.ts` y montarla en `app.routes.ts` antes de `pedidos`. Pruebas con temporizadores simulados: el sondeo se detiene al cambiar de estado, al agotarse el tiempo y al destruir la página, y respeta el límite de peticiones.
7. **Historial.** Crear `pages/mis-pagos/` con `app-table`, `app-pagination`, filtros en la URL y estados. Sustituir el `loadComponent` de `pagos`.
8. **Detalle.** Crear `pages/pago-detalle/` con el resumen, el enlace al pedido, **Reintentar pago** cuando aplica y el sondeo de un pago `PROCESSING`. Sustituir el `loadComponent` de `pagos/:id`.
9. **Cierre.** Actualizar `route-map.spec.ts` (la ruta ahora vive en `features/pagos`) y `CLAUDE.md` (árbol con `core/orders`, `ApiError.code`, dirección de dependencias, "el resto de pantallas siguen siendo placeholders hasta la SPEC 09"). Recorrido manual completo contra el backend con cada escenario de prueba y revisión AXE.

## Criterios de aceptación

- [ ] `/pedidos/:id/pago`, `/pagos` y `/pagos/:id` ya no muestran el placeholder, y un visitante, proveedor o administrador que las abre termina en `/auth/login?returnUrl=…` o `/acceso-denegado` según corresponda.
- [ ] `/pedidos/:id/pago` se sirve desde `features/pagos` y `pedidos.routes.ts` ya no la declara; el botón **Pagar** del detalle de pedido sigue llevando a ella.
- [ ] La pantalla de pago muestra el monto del pedido, su estado y el cronómetro, y no tiene ningún campo de monto ni de datos de tarjeta.
- [ ] El formulario ofrece los métodos Tarjeta, PSE y Nequi y los escenarios Aprobado, Rechazado, Error de pasarela y Pendiente, rotulados como simulador; **Otro token** muestra un campo de texto y sin texto no se envía.
- [ ] Pagar con el escenario Aprobado envía `POST /payments` con `Idempotency-Key` de 8 a 100 caracteres y `token: 'tok_test_approved'`, muestra "Pago aprobado" con la referencia y el pedido pasa a `CONFIRMED`.
- [ ] Tras un pago aprobado la pantalla espera a que el pedido esté `CONFIRMED` (máximo 30 segundos) antes de ofrecer los enlaces, y si no llega muestra un aviso con **Actualizar**.
- [ ] Un pago rechazado muestra "Fondos insuficientes", mantiene el formulario y permite reintentar; el reintento usa una `Idempotency-Key` distinta de la anterior.
- [ ] Un pago con error de pasarela muestra el mensaje de reintento y permite volver a intentarlo con una clave nueva.
- [ ] Un token inválido en **Otro token** se envía tal cual y muestra el rechazo del backend.
- [ ] El escenario Pendiente deja el pago en "En proceso", sondea `GET /payments/:id` cada 8 segundos y se detiene al cambiar de estado, a los 2 minutos o al salir de la pantalla; al detenerse por tiempo se ofrece **Actualizar**.
- [ ] Durante el envío el botón Pagar queda deshabilitado, se muestra "Procesando pago…" con `aria-busy="true"` y un doble clic no genera dos cobros.
- [ ] Repetir el envío tras un error de red (`status 0`) o `429` usa la misma `Idempotency-Key`, y el mensaje aclara que un cobro ya procesado no se repite.
- [ ] Un `409` `ORDER_NOT_PAYABLE` muestra "El pedido ya no admite pago" con enlace al pedido; un `409` `PAYMENT_IN_PROGRESS` vuelve a cargar y muestra el pago en curso.
- [ ] Un `429` muestra "Demasiados intentos, espera un minuto" y el botón no queda bloqueado para siempre.
- [ ] Abrir la pantalla de un pedido con un pago `PROCESSING`, `PENDING` o `APPROVED` muestra el estado de ese pago y no el formulario.
- [ ] Un pedido `PENDING`, `CONFIRMED`, `CANCELLED` o vencido muestra un estado explicativo con enlace al pedido y sin formulario.
- [ ] Un pedido ajeno, inexistente o con id inválido muestra "Pedido no encontrado" con enlace a `/pedidos`.
- [ ] El sondeo de pagos no agota el límite de 10 peticiones por minuto del backend: con un pago `PROCESSING` abierto durante 2 minutos no aparece ningún `429`, y si aparece uno el sondeo omite el ciclo y duplica el intervalo.
- [ ] `/pagos` lista los pagos propios con fecha, método, monto y estado, paginados, con `?status=`, `?orderId=` y `?page=` en la URL que sobreviven a recargar; valores inválidos se ignoran.
- [ ] `/pagos/:id` muestra monto, método, estado, referencia y motivo de rechazo, el enlace al pedido y **Reintentar pago** solo si el pago fue `DECLINED` o `ERROR` y el pedido sigue en `AWAITING_PAYMENT` sin vencer.
- [ ] Un pago ajeno, inexistente o con id inválido muestra "Pago no encontrado" con enlace a `/pagos`.
- [ ] Con el backend apagado, cada pantalla muestra "No se pudo conectar con el servidor" con Reintentar, y un fallo durante un sondeo no borra lo ya mostrado.
- [ ] Todos los montos se muestran con `formatCop`.
- [ ] El token y la `Idempotency-Key` no aparecen en `localStorage`, `sessionStorage`, la URL ni la consola.
- [ ] `ApiError` tiene `code` opcional, `toApiError` lo rellena desde el cuerpo y los specs existentes de `core/http` siguen pasando.
- [ ] Los tipos de pedido, `OrdersApi`, el cronómetro y la insignia viven en `core/orders`, y `features/pedidos` los usa desde `index.ts` con el mismo número de tests que la línea base tras el paso 3.
- [ ] `core/orders` solo importa de `core/http`, y ninguna feature importa de otra feature: `grep -rnE "from '(\.\./)+(auth|cuenta|catalogo|proveedor|pedidos|admin)(/|')" src/app/features/pagos` devuelve vacío, y el equivalente para `features/pedidos` con `pagos`.
- [ ] Ningún `import` estático apunta a un archivo interno de otro módulo (regla de la SPEC 04) y ningún `index.ts` usa `export *`.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] Las tres pantallas no tienen violaciones AXE en claro ni en oscuro, el resultado del pago se anuncia a lectores de pantalla, todo se maneja con teclado y a 360, 768 y 1280 px no hay scroll horizontal de página.
- [ ] Los chunks lazy de las tres pantallas aparecen por separado en la salida de `ng build`.
- [ ] `ng test` pasa con más tests que la línea base del paso 1 y `npm run build` termina sin errores ni avisos nuevos.
- [ ] `CLAUDE.md` refleja `core/orders`, `ApiError.code`, la dirección de dependencias y el estado de los placeholders restantes.

## Decisiones tomadas y descartadas

- **Sí:** selector de método y de escenario de prueba, con "Otro token" como campo libre, y rotulado como simulador. Es la única forma honesta de decidir el resultado con una pasarela simulada, sin que el usuario memorice los tokens, y deja probar el token inválido.
- **No:** solo escenarios fijos ni solo campo de texto. Lo primero no permite probar un token inválido; lo segundo obliga a conocer los valores de memoria.
- **No:** campos de tarjeta (número, vencimiento, CVV). El backend nunca debe recibir datos reales y un formulario así sugeriría lo contrario.
- **Sí:** la pantalla de pago vive en `features/pagos` y la lectura de pedidos pasa a `core/orders`. El pago es del dominio pagos y lo que necesita del pedido (monto, estado, cronómetro) es de solo lectura y también lo usará la administración.
- **No:** dejar la pantalla en `features/pedidos` con `PagosApi` en `core/payments`: deja la lógica de cobro en `core` y la feature pagos casi vacía. Tampoco permitir que pagos importe de pedidos: rompe la regla de la SPEC 04.
- **Sí:** montar la ruta `pedidos/:id/pago` en `app.routes.ts` con `loadChildren` de pagos, antes de `pedidos`. La URL no cambia y cada dominio conserva sus rutas.
- **Sí:** `OrdersApi` en `core/orders` solo con `getOrder`; `checkout` y `listOrders` se quedan en `PedidosApi`. Solo se mueve lo que dos features usan hoy.
- **Sí:** `ApiError.code` opcional. Los dos `409` del backend solo se distinguen por `code`; comparar el texto del mensaje es frágil.
- **Sí:** `Idempotency-Key` en memoria; nueva tras `DECLINED`, `ERROR` y `422`; la misma tras `status 0` o `429`. El backend devuelve el mismo pago con la misma clave, así un reintento por red no cobra dos veces, y una clave usada siempre da el mismo resultado, por eso no se reutiliza para reintentar.
- **No:** persistir la clave o el token. No aportan tras recargar y son datos sensibles.
- **Sí:** sondeo de 8 segundos, máximo 2 minutos, con retroceso ante `429`. El backend limita todo `payments` a 10 peticiones por minuto, y un resultado `PROCESSING` solo lo resuelve un webhook externo que puede no llegar nunca.
- **No:** sondeo cada 2 o 3 segundos como en los pedidos. Agotaría el límite y haría que el usuario vea `429`.
- **No:** un botón para simular el webhook en la app. Exigiría el secreto de firma en el cliente y es una vulneración; queda fuera de la app.
- **Sí:** tras un pago aprobado esperar a que el pedido esté `CONFIRMED` (máximo 30 segundos) antes de ofrecer los enlaces. La confirmación es asíncrona y el usuario volvería al pedido viéndolo todavía `AWAITING_PAYMENT` con un botón Pagar.
- **Sí:** si el último pago del pedido está `PROCESSING`, `PENDING` o `APPROVED`, mostrar su estado en vez del formulario. Es lo que evita el `409` `PAYMENT_IN_PROGRESS` y un segundo cobro.
- **Sí:** `PAGOS_PAGE_SIZE = 10`, igual que pedidos y proveedor.
- **Sí:** la validación del cliente es ayuda de UX; el backend sigue siendo la autoridad.

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| El límite de 10 peticiones por minuto devuelve `429` durante el sondeo | Intervalo de 8 segundos, retroceso ante `429`, tope de 2 minutos y criterio de aceptación sobre ausencia de `429`. |
| Un pago `PROCESSING` no se resuelve nunca porque no llega el webhook | El sondeo se detiene a los 2 minutos y ofrece Actualizar; se explica que el pago está pendiente de confirmación. |
| Un doble clic o un reintento por red cobra dos veces | `Idempotency-Key` por intento, botón deshabilitado y reutilización de la clave solo cuando no hubo respuesta. |
| Reutilizar la clave tras un `DECLINED` devuelve el mismo resultado y el usuario cree que no puede reintentar | Clave nueva tras `DECLINED`, `ERROR` y `422`; hay tests de cada caso. |
| El pedido pasa a `CONFIRMED` con retraso y el usuario ve un botón Pagar de nuevo | Espera acotada a `CONFIRMED` antes de los enlaces y comprobación del último pago al abrir la pantalla. |
| Mover `OrdersApi`, el cronómetro y la insignia rompe imports o specs de la SPEC 07 | Paso 3 aislado como refactor puro con `ng test` con el mismo número de tests y `ng build` en verde antes de seguir. |
| La ruta movida a `features/pagos` queda tapada por `pedidos/:id` | Se monta antes de `pedidos` en `app.routes.ts` y hay un test de enrutado que abre `/pedidos/:id/pago`. |
| `code` no viene en todos los errores del backend | Es opcional; sin `code` se muestra el `message` y el paso 1 verifica los casos reales. |
| El cronómetro y el vencimiento en el reloj del cliente discrepan del servidor | Al llegar a 0 se vuelve a consultar el pedido y el backend manda; un `409` `ORDER_NOT_PAYABLE` se explica sin perder el contexto. |
| Se confunde el simulador con un pago real | Rótulo visible de simulador, sin campos de tarjeta y texto aclaratorio. |
| Las pruebas con temporizadores y sondeo son frágiles | Funciones puras para plazos y reintentos y temporizadores simulados de Vitest. |

## Lo que **no** está en esta spec

- Administración de pagos con historial de intentos (SPEC 09).
- El webhook de la pasarela y cualquier forma de resolver a mano un pago `PROCESSING`.
- Datos reales de tarjeta, guardar métodos de pago, reembolsos y comprobantes.
- Notificaciones en tiempo real.
- Cualquier cambio en el backend.
- Tests e2e e internacionalización.

Cada uno de estos, si se aborda, va en su propio spec.
