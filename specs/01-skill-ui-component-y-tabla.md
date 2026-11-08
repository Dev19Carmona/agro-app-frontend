# SPEC 01 — Skill `ui-component` y componente `<app-table>` sobre PrimeNG

> **Status:** Draft
> **Depends on:** Ninguna
> **Date:** 2026-11-08
> **Objective:** Crear la skill de proyecto `ui-component` (y la regla en `CLAUDE.md` que obliga a usarla) y validarla construyendo `<app-table>`, un wrapper propio de la tabla de PrimeNG que aísla la librería del resto de la app.

---

## Por qué existe esta spec

Hoy PrimeNG está instalado (`primeng`, `@primeuix/themes`, `primeicons`, `tailwindcss-primeui`) pero ningún componente lo usa. Si las features importan `p-table` directamente, cambiar de librería obliga a tocar toda la app. La solución es una capa `shared/ui/` con componentes propios que son los únicos que conocen PrimeNG. La skill estandariza cómo se crean esos componentes y la tabla es el primer caso, que sirve de prueba.

## Alcance

**Dentro:**

- Skill de proyecto en `.claude/skills/ui-component/SKILL.md` que define cómo crear y actualizar componentes wrapper sobre PrimeNG.
- Regla en `CLAUDE.md`: toda tarea que necesite un componente de UI nuevo (o una feature nueva en uno existente) debe invocar la skill `ui-component`. Se prohíbe importar `primeng/*` fuera de `src/app/shared/ui/`.
- Componente `<app-table>` en `src/app/shared/ui/table/` con estas features (las de la captura de https://primeng.dev/table):
  - Basic.
  - Size (`small` | `medium` | `large`).
  - Grid lines.
  - Striped rows.
  - Selection: `single`, `multiple`, checkbox, radio, teclado, por columna y eventos.
  - Sort: `single`, `multiple`, presort y removable.
- Celdas personalizadas mediante una directiva propia.
- Tipos propios exportados desde `src/app/shared/ui/table/table.types.ts`.
- Página demo lazy en la ruta `/ui/table` con todas las variantes.
- Tests Vitest del wrapper.

**Fuera de alcance (para otras specs o para una invocación futura de la skill):**

- Filter, paginator, row expansion, edición de celdas, lazy loading, virtual scroll, reorder, resize, export, frozen columns y row grouping de PrimeNG.
- Otros componentes de UI (botón, input, dialog, etc.). Se crean después, invocando la skill.
- Definir el tema visual (presets de `@primeuix/themes`) más allá de lo que ya esté configurado.
- Si más adelante se necesita una feature extra de la tabla, se invoca la skill `ui-component` para ampliar el wrapper. No requiere spec nueva salvo que sea grande.

## Modelo de datos

Tipos propios, sin ninguna referencia a `primeng` en la API pública del componente.

```ts
// src/app/shared/ui/table/table.types.ts
export type TableSize = 'small' | 'medium' | 'large';
export type TableSelectionMode = 'none' | 'single' | 'multiple';
export type TableSelectionControl = 'row' | 'checkbox' | 'radio'; // cómo se selecciona
export type TableSortMode = 'none' | 'single' | 'multiple';
export type SortOrder = 'asc' | 'desc';

export interface TableColumn<T = unknown> {
  field: keyof T & string;
  header: string;
  sortable?: boolean;
  width?: string;
  selectable?: boolean; // selección por columna
}

export interface SortState {
  field: string;
  order: SortOrder;
}

export interface TableRowEvent<T> {
  row: T;
  index: number;
}
```

API pública de `<app-table>` (nombres definitivos):

| Tipo         | Nombre                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| `input()`    | `data`, `columns`, `size`, `showGridlines`, `striped`                         |
| `input()`    | `selectionMode`, `selectionControl`, `keyboardSelection`, `sortMode`, `removableSort` |
| `model()`    | `selection`, `sort` (`SortState[]`, sirve también como presort)               |
| `output()`   | `rowSelect`, `rowUnselect`, `sortChange`                                      |
| Directiva    | `appTableCell` (`ng-template` por columna, contexto `{ $implicit: row, column }`) |

Convenciones:

- Valores por defecto: `size='medium'`, `showGridlines=false`, `striped=false`, `selectionMode='none'`, `selectionControl='row'`, `sortMode='none'`, `removableSort=false`.
- El mapeo de estos valores a `p-table` (`size`, `showGridlines`, `stripedRows`, `selectionMode`, `metaKeySelection`, `sortMode`, `removableSort`, `multiSortMeta`) vive solo dentro del wrapper.
- Prefijo de selector: `app-`.

## Plan de implementación

1. Crear `.claude/skills/ui-component/SKILL.md` con: cuándo se invoca, reglas del wrapper (API con tipos propios, `input()`/`output()`/`model()`, sin exponer eventos ni tipos de PrimeNG, accesibilidad), estructura de archivos por componente, checklist de verificación y el flujo para ampliar un componente ya existente.
2. Añadir a `CLAUDE.md` una sección "Componentes de UI" con la regla de invocar la skill y la prohibición de importar `primeng/*` fuera de `src/app/shared/ui/`.
3. Verificar que PrimeNG esté configurado en `src/app/app.config.ts` (`providePrimeNG` con tema) y ajustar solo lo mínimo para que la tabla se vea correctamente. Se comprueba con `npm run build`.
4. Crear `table.types.ts` con los tipos del modelo de datos.
5. Crear `table.ts` y `table.html` con la tabla básica (`data` + `columns`), la directiva `appTableCell` y los inputs `size`, `showGridlines` y `striped`.
6. Añadir selección: `selectionMode`, `selectionControl`, `keyboardSelection`, `selectable` por columna, `model` `selection` y outputs `rowSelect`/`rowUnselect`.
7. Añadir ordenamiento: `sortMode`, `removableSort`, `model` `sort` (con presort) y output `sortChange`.
8. Crear la página demo lazy `/ui/table` y registrarla en `src/app/app.routes.ts` con `loadComponent`.
9. Escribir `table.spec.ts` con Vitest (render, cada variante, selección, orden).

## Criterios de aceptación

- [ ] Existe `.claude/skills/ui-component/SKILL.md` y aparece como skill invocable en el proyecto.
- [ ] `CLAUDE.md` contiene la regla que obliga a invocar `ui-component` para cualquier componente de UI nuevo.
- [ ] `grep -r "primeng" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/` (y `app.config.ts` para `providePrimeNG`).
- [ ] La API pública de `<app-table>` no exporta ningún tipo ni evento de `primeng`.
- [ ] `size` cambia la altura de las filas entre `small`, `medium` y `large`.
- [ ] `showGridlines` muestra bordes de celda y `striped` alterna el fondo de filas.
- [ ] Con `selectionMode='single'`, hacer clic en una fila actualiza `selection` con esa fila y emite `rowSelect`.
- [ ] Con `selectionMode='multiple'` y `selectionControl='checkbox'` se pueden seleccionar varias filas y la cabecera tiene un checkbox de "seleccionar todo".
- [ ] Con `selectionControl='radio'` solo una fila queda seleccionada a la vez.
- [ ] Con `keyboardSelection` activo, las flechas mueven el foco entre filas y Enter/Espacio selecciona.
- [ ] Quitar una fila de `selection` emite `rowUnselect`.
- [ ] Con `sortMode='single'`, hacer clic en una cabecera ordena por esa columna y emite `sortChange`.
- [ ] Con `sortMode='multiple'` se pueden ordenar varias columnas a la vez.
- [ ] Un valor inicial en `sort` se aplica al renderizar (presort).
- [ ] Con `removableSort=true`, un tercer clic en la cabecera quita el orden.
- [ ] Una celda con `appTableCell` renderiza el template del consumidor.
- [ ] `/ui/table` carga de forma lazy y muestra todas las variantes.
- [ ] `ng test` pasa con los tests de `table.spec.ts`.
- [ ] `npm run build` termina sin errores.
- [ ] La tabla de la demo no tiene violaciones AXE y las cabeceras ordenables exponen `aria-sort`.

## Decisiones tomadas y descartadas

- **Sí:** una sola spec para skill, regla y tabla. La tabla valida la skill.
- **No:** dos specs separadas. Habría una skill sin probar.
- **Sí:** skill de proyecto en `.claude/skills/`. Queda versionada y la ven todos los colaboradores.
- **No:** skill global en `~/.claude/skills/`. No quedaría en el repo.
- **Sí:** wrappers en `src/app/shared/ui/` con prefijo `app-`. Deja un único lugar donde se importa PrimeNG.
- **Sí:** columnas por configuración (`TableColumn[]`) más template opcional (`appTableCell`). Cubre el caso simple y el personalizado sin acoplar a la estructura de PrimeNG.
- **No:** solo templates. Obligaría al consumidor a conocer `p-table`.
- **Sí:** `model()` y `output()` con tipos propios. Es lo que permite cambiar de librería sin tocar las features.
- **No:** re-exportar eventos de PrimeNG. Filtraría el tipo a toda la app.
- **Sí:** variantes como uniones de strings. Los valores se mapean a PrimeNG dentro del wrapper.
- **Sí:** alcance de features limitado a la captura, priorizando lo más usado. Cualquier extra se añade invocando la misma skill.
- **No:** cubrir todo el catálogo de primeng.dev/table ahora. Es demasiado grande para una spec.
- **Sí:** página demo `/ui/table`. Sirve de revisión visual y de base para el test de accesibilidad.

## Riesgos identificados

| Riesgo                                                                 | Mitigación                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| La API propia no cubre un caso futuro de PrimeNG                       | La skill define el flujo de ampliación del wrapper. No se expone PrimeNG como atajo.        |
| PrimeNG 22 cambia nombres de inputs o estilos respecto a la documentación | El plan revisa la API real instalada (`node_modules/primeng`) antes de mapear.              |
| Contraste o foco insuficientes con el tema por defecto                 | El criterio AXE/WCAG AA se verifica sobre la demo y se ajusta el estilo dentro del wrapper. |
| Selección por radio/checkbox no encaja con el modelo único `selection` | `selection` es `T \| T[] \| null` según `selectionMode`. Se documenta en la skill y se prueba. |

## Lo que **no** está en esta spec

- Filter, paginator, expansión de filas, edición, lazy loading, virtual scroll, reorder, resize, export, columnas congeladas y agrupación de filas.
- Otros componentes de UI distintos de la tabla.
- Rediseño del tema visual.
- Migración a otra librería de UI (solo se deja preparado el aislamiento).
