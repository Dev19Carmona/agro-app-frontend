---
name: ui-component
description: Crea o amplía componentes de UI wrapper sobre Angular Material en src/app/shared/ui/. Úsala SIEMPRE que haga falta un componente de UI nuevo (botón, input, tabla, dialog, etc.) o una feature nueva en uno existente. Nunca importes @angular/material/* ni @angular/cdk/* fuera de src/app/shared/ui/.
---

# /ui-component — Wrappers de UI sobre Angular Material

Los componentes de `src/app/shared/ui/` son los **únicos** que conocen Angular Material y el CDK. El resto de la app (features, páginas) consume solo componentes `app-*` con API propia. Así, cambiar de librería de UI solo obliga a tocar esta carpeta.

## Cuándo se invoca

- Hace falta un componente de UI que no existe en `src/app/shared/ui/`.
- Hace falta una feature nueva en un componente wrapper existente (ampliación).
- Un feature o página está importando `@angular/material/*` o `@angular/cdk/*` directamente (hay que moverlo al wrapper).

Si la tarea solo consume un componente ya existente con su API actual, no hace falta invocarla.

## Reglas del wrapper

1. **Aislamiento:** `@angular/material/*` y `@angular/cdk/*` solo se importan dentro de `src/app/shared/ui/`. El tema de Material vive en `src/material-theme.scss` y se registra en `angular.json`; no cuenta como importación de código.
2. **API con tipos propios:** inputs, outputs y models usan tipos definidos en `<nombre>.types.ts`. Prohibido exponer o re-exportar tipos, eventos o clases de Material/CDK (`SelectionModel`, `Sort`, `MatTableDataSource`, etc.).
3. **Variantes como uniones de strings** (`'small' | 'medium' | 'large'`). El mapeo a la librería (clases, tokens CSS, inputs) vive solo dentro del wrapper.
4. **Señales:** `input()`, `output()` y `model()` (para propiedades con `[(prop)]`). Sin decoradores `@Input`/`@Output`. Estado derivado con `computed()`.
5. **Un `model()` ya expone su output `<nombre>Change`.** No declares además un `output()` con ese nombre: el compilador da el error NG1054.
6. **Convenciones de Angular del proyecto:** standalone por defecto (no escribir `standalone: true`), sin `ChangeDetectionStrategy.OnPush` explícito, `host` en vez de `@HostBinding`/`@HostListener`, control flow nativo (`@if`, `@for`), bindings de `class`/`style` en vez de `ngClass`/`ngStyle`, `inject()` en vez de constructor.
7. **Selector con prefijo `app-`.** El nombre de la clase sigue lo que ya exista en la carpeta (por ejemplo `Table`, importando el de la librería con alias si choca el nombre).
8. **Valores por defecto explícitos y documentados** en la spec o en el componente.
9. **Personalización de contenido:** configuración por datos (por ejemplo `columns`) más una directiva propia con `ng-template` (por ejemplo `appTableCell`) para el caso personalizado. No obligar al consumidor a conocer las plantillas de Material.
10. **Modelo de selección/valor único:** cuando un mismo `model()` sirve a varios modos, tipar como unión (por ejemplo `selection: T | T[] | null`) y documentar cómo se interpreta según el modo y el control.
11. **No exigir a la librería lo que no trae.** Comprueba en `node_modules/@angular/material` y `node_modules/@angular/cdk` que la feature existe y cómo se comporta antes de mapearla. Si no existe o es insuficiente (por ejemplo `MatSort` no admite orden múltiple, `mat-table` no trae selección por teclado), impleméntala en el wrapper con tipos propios en vez de forzar la librería.
12. **No mutar datos del consumidor.** Ordena o filtra siempre una copia.
13. **Iconos sin dependencias externas:** SVG inline. No se carga la fuente Material Icons de Google Fonts.
14. **Accesibilidad (obligatoria):** debe pasar AXE y WCAG AA: roles y atributos ARIA correctos (`aria-sort`, `aria-label`, etc.), foco visible, navegación por teclado, contraste suficiente. Los controles sin texto visible llevan `aria-label`. Si el tema no cumple, se corrige el estilo dentro del wrapper.
15. **Estilos:** Tailwind en `src/styles.css`; el tema de Material en `src/material-theme.scss`. Los ajustes propios del wrapper (tamaños, líneas, filas alternas) van en el componente con clases y tokens CSS de Material, no en estilos globales.

## Estructura de archivos por componente

```
src/app/shared/ui/<nombre>/
├── <nombre>.ts            # componente (y directivas auxiliares si son pequeñas)
├── <nombre>.html          # plantilla (inline si es pequeña)
├── <nombre>.types.ts      # tipos propios exportados (API pública)
├── <nombre>.spec.ts       # tests Vitest
├── <nombre>-demo.ts/.html # página demo lazy
└── <nombre>-<x>.ts        # directivas/piezas auxiliares si hacen falta
```

La demo se registra como página lazy bajo la ruta `/ui/<nombre>` en `src/app/app.routes.ts` con `loadComponent`.

## Flujo para crear un componente nuevo

1. Leer la API real en `node_modules/@angular/material/<componente>` (y el CDK si aplica) y decidir qué subconjunto se expone.
2. Definir los tipos propios en `<nombre>.types.ts` (sin ninguna referencia a Material/CDK).
3. Implementar el wrapper mapeando tipos propios a Material solo internamente.
4. Crear la página demo lazy con todas las variantes.
5. Escribir tests Vitest (render, cada variante, eventos, modelos).
6. Pasar el checklist de verificación.

## Flujo para ampliar un componente existente

1. Leer el componente, sus tipos y sus tests actuales.
2. Añadir los tipos nuevos a `<nombre>.types.ts`; **no** romper la API pública existente (añadir inputs opcionales con valor por defecto que conserve el comportamiento previo).
3. Mapear la feature nueva a la librería dentro del wrapper.
4. Añadir la variante a la demo y tests para la feature nueva.
5. Pasar el checklist de verificación.

Una ampliación pequeña no requiere spec nueva; una grande sí.

## Checklist de verificación

- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] La API pública (inputs, outputs, models, tipos exportados) no contiene tipos ni eventos de Material/CDK.
- [ ] Todas las variantes están en la demo `/ui/<nombre>` y la ruta carga de forma lazy.
- [ ] Tests Vitest del wrapper pasan (`ng test`).
- [ ] `npm run build` termina sin errores.
- [ ] **El build solo comprueba lo que se alcanza desde `main.ts`:** el componente se compila de verdad a través de la demo, así que comprueba que la demo lo importa. Cuando se pueda, valida también con `ngc` sobre el componente.
- [ ] Sin violaciones AXE en la demo; ARIA, foco y teclado revisados. Las reglas de contraste solo se pueden comprobar en el navegador, no en jsdom.
- [ ] Contraste WCAG AA verificado con el tema configurado.
- [ ] Abrir la demo en el navegador y revisar la consola: sin errores ni avisos.
