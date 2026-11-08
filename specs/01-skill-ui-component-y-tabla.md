# SPEC 01 — Skill `ui-component` y componente `<app-table>` sobre Angular Material

> **Status:** Aprobado
> **Depends on:** Ninguna
> **Date:** 2026-11-08
> **Revisión:** 2026-11-08 — la librería de UI pasa de PrimeNG a Angular Material (ver "Por qué cambió el alcance").
> **Objective:** Crear la skill de proyecto `ui-component` (y la regla en `CLAUDE.md` que obliga a usarla) y validarla construyendo `<app-table>`, un wrapper propio de la tabla de Angular Material que aísla la librería del resto de la app.

---

## Por qué existe esta spec

Si las features importan directamente los componentes de la librería de UI, cambiar de librería obliga a tocar toda la app. La solución es una capa `shared/ui/` con componentes propios que son los únicos que conocen la librería. La skill estandariza cómo se crean esos componentes y la tabla es el primer caso, que sirve de prueba.

## Por qué cambió el alcance

La spec original usaba PrimeNG. PrimeNG 22 dejó de ser MIT: exige una clave de licencia y, sin ella, pinta el cartel "Invalid PrimeUI License" en todas las pantallas. La licencia gratuita (Community) está sujeta a requisitos y a renovación anual, y PrimeNG pasó a modo de mantenimiento. Se decide **eliminar PrimeNG y usar Angular Material** (MIT, mantenido por el equipo de Angular). El diseño de la capa `shared/ui/` y la API pública de `<app-table>` no cambian, lo que valida el aislamiento: solo cambia lo que hay dentro del wrapper.

## Alcance

**Dentro:**

- Skill de proyecto en `.claude/skills/ui-component/SKILL.md` que define cómo crear y actualizar componentes wrapper sobre Angular Material.
- Regla en `CLAUDE.md`: toda tarea que necesite un componente de UI nuevo (o una feature nueva en uno existente) debe invocar la skill `ui-component`. Se prohíbe importar `@angular/material/*` y `@angular/cdk/*` fuera de `src/app/shared/ui/`.
- Eliminar PrimeNG del proyecto: dependencias `primeng`, `@primeuix/themes`, `primeicons` y `tailwindcss-primeui`; `providePrimeNG` en `app.config.ts`; y sus capas e imports en `src/styles.css`.
- Instalar `@angular/material` y `@angular/cdk` (22.2.6, alineadas con Angular 22) y configurar el tema de Material en un archivo SCSS aparte (`src/material-theme.scss`) registrado en `angular.json`. Tailwind sigue en `src/styles.css`.
- Componente `<app-table>` en `src/app/shared/ui/table/` con estas features:
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

- Filter, paginator, row expansion, edición de celdas, lazy loading, virtual scroll, reorder, resize, export, frozen columns y row grouping.
- Otros componentes de UI (botón, input, dialog, etc.). Se crean después, invocando la skill.
- Definir una identidad visual propia más allá de un tema base de Material.
- Si más adelante se necesita una feature extra de la tabla, se invoca la skill `ui-component` para ampliar el wrapper. No requiere spec nueva salvo que sea grande.

## Modelo de datos

Tipos propios, sin ninguna referencia a `@angular/material` ni `@angular/cdk` en la API pública del componente.

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
  selectable?: boolean; // columna que aloja el checkbox/radio de selección
}

export interface SortState {
  field: string;
  order: SortOrder;
}

export interface TableRowEvent<T> {
  row: T;
  index: number; // índice de la fila en `data`
}
```

API pública de `<app-table>` (nombres definitivos):

| Tipo         | Nombre                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| `input()`    | `data`, `columns`, `size`, `showGridlines`, `striped`                         |
| `input()`    | `selectionMode`, `selectionControl`, `keyboardSelection`, `sortMode`, `removableSort` |
| `model()`    | `selection` (`T \| T[] \| null`), `sort` (`SortState[]`, sirve también como presort) |
| `output()`   | `rowSelect`, `rowUnselect`                                                    |
| Directiva    | `appTableCell` (`ng-template` por columna, contexto `{ $implicit: row, column }`) |

Convenciones:

- Valores por defecto: `size='medium'`, `showGridlines=false`, `striped=false`, `selectionMode='none'`, `selectionControl='row'`, `keyboardSelection=true`, `sortMode='none'`, `removableSort=false`.
- `sortChange` no se declara como `output()`: lo genera automáticamente el `model()` `sort` y emite `SortState[]` en cada cambio.
- `selectable` (por columna): con `selectionControl='checkbox'` o `'radio'`, el control se pinta en la celda de la primera columna marcada `selectable`. Si ninguna lo está, se añade una columna extra al inicio.
- `selectionControl='checkbox'` implica selección múltiple y `'radio'` selección única, con independencia de `selectionMode` (excepto `'none'`, que desactiva la selección).
- `keyboardSelection=true`: las filas seleccionables (`selectionControl='row'`) son enfocables, las flechas mueven el foco y Enter/Espacio seleccionan. Con `false`, la selección es solo por ratón.
- Selección y orden son responsabilidad del wrapper, no de la librería:
  - Selección con `SelectionModel` de `@angular/cdk/collections`, usando `MatCheckbox` y `MatRadioButton` como controles.
  - Orden propio: el wrapper ordena una copia de `data` (nunca muta el array del consumidor) con `Intl.Collator`. Las cabeceras ordenables son botones con `aria-sort`. Se descarta `MatSort` porque no admite orden múltiple. Ciclo por columna: asc → desc → quitar (si `removableSort`) o vuelta a asc. En modo `multiple`, un clic añade la columna al orden sin tecla modificadora.
- `size`, `showGridlines` y `striped` se resuelven con clases y tokens CSS del wrapper sobre `mat-table`. La densidad usa los tokens de Material cuando existen.
- Los eventos `rowSelect` y `rowUnselect` se emiten por interacción del usuario, no cuando `selection` cambia desde fuera.
- Prefijo de selector: `app-`.

## Plan de implementación

1. Actualizar `.claude/skills/ui-component/SKILL.md` para Angular Material: cuándo se invoca, reglas del wrapper (API con tipos propios, `input()`/`output()`/`model()`, sin exponer tipos ni eventos de Material/CDK, accesibilidad), estructura de archivos por componente, checklist de verificación y el flujo para ampliar un componente existente. Incluir las lecciones aprendidas: un `model()` ya expone su `<nombre>Change`, comprobar en `node_modules` que la feature existe antes de mapearla, y el build solo comprueba lo que se alcanza desde `main.ts` (la demo sirve para verificar).
2. Actualizar la sección "Componentes de UI" de `CLAUDE.md` con la prohibición de importar `@angular/material/*` y `@angular/cdk/*` fuera de `src/app/shared/ui/`.
3. Migrar de PrimeNG a Angular Material: desinstalar los cuatro paquetes de PrimeNG, instalar `@angular/material` y `@angular/cdk`, quitar `providePrimeNG` y la configuración de PrimeNG de `styles.css`, crear `src/material-theme.scss`, registrarlo en `angular.json` y comprobar con `npm run build`. No debe quedar ninguna referencia a PrimeNG en `package.json` ni en `src`.
4. Verificar `table.types.ts`: se conserva sin cambios y sin referencias a ninguna librería.
5. Reescribir `table.ts` y `table.html` sobre `mat-table`: tabla básica (`data` + `columns`), directiva `appTableCell` (se conserva), `size`, `showGridlines` y `striped`.
6. Reescribir la selección: `selectionMode`, `selectionControl`, `keyboardSelection`, `selectable` por columna, `model` `selection` y outputs `rowSelect`/`rowUnselect`, sobre `SelectionModel`, `MatCheckbox` y `MatRadioButton`, con navegación por teclado propia.
7. Adaptar el ordenamiento: se conserva la lógica del wrapper (`sortMode`, `removableSort`, `model` `sort` con presort) y se sustituyen los iconos de PrimeIcons por SVG inline, sin depender de ninguna fuente externa.
8. Adaptar la página demo lazy `/ui/table`, ya registrada en `src/app/app.routes.ts` con `loadComponent`, a la nueva implementación.
9. Adaptar `table.spec.ts` (Vitest): los tests de comportamiento se conservan y los de clases CSS y selectores se reescriben para Material.

## Criterios de aceptación

- [ ] Existe `.claude/skills/ui-component/SKILL.md` y aparece como skill invocable en el proyecto.
- [ ] `CLAUDE.md` contiene la regla que obliga a invocar `ui-component` para cualquier componente de UI nuevo.
- [ ] `grep -rE "@angular/(material|cdk)" src/app --include=*.ts --include=*.html` solo devuelve resultados dentro de `src/app/shared/ui/`.
- [ ] No queda ninguna referencia a `primeng` en `package.json`, `src/` ni `angular.json`, y la app no muestra ningún aviso de licencia.
- [ ] La API pública de `<app-table>` no exporta ningún tipo ni evento de Angular Material ni de CDK.
- [ ] `size` cambia la altura de las filas entre `small`, `medium` y `large`.
- [ ] `showGridlines` muestra bordes de celda y `striped` alterna el fondo de filas.
- [ ] Con `selectionMode='single'`, hacer clic en una fila actualiza `selection` con esa fila y emite `rowSelect`.
- [ ] Con `selectionMode='multiple'` y `selectionControl='checkbox'` se pueden seleccionar varias filas y la cabecera tiene un checkbox de "seleccionar todo".
- [ ] Con `selectionControl='radio'` solo una fila queda seleccionada a la vez.
- [ ] Con `keyboardSelection` activo, las flechas mueven el foco entre filas y Enter/Espacio selecciona.
- [ ] Con `selectable` en una columna, el checkbox/radio se pinta en esa columna y no hay columna extra.
- [ ] Quitar una fila de `selection` desde la tabla emite `rowUnselect`.
- [ ] Con `sortMode='single'`, hacer clic en una cabecera ordena por esa columna y `sort` emite `sortChange`.
- [ ] Con `sortMode='multiple'` se pueden ordenar varias columnas a la vez.
- [ ] Un valor inicial en `sort` se aplica al renderizar (presort).
- [ ] Con `removableSort=true`, un tercer clic en la cabecera quita el orden.
- [ ] Ordenar no muta el array `data` del consumidor.
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
- **Sí:** wrappers en `src/app/shared/ui/` con prefijo `app-`. Deja un único lugar donde se importa la librería de UI.
- **Sí:** Angular Material como librería. Es MIT, la mantiene el equipo de Angular y no exige clave.
- **No:** seguir con PrimeNG. La versión 22 exige licencia, y la gratuita está sujeta a requisitos y renovación anual.
- **No:** fijar PrimeNG en la 21.x (MIT). Queda congelado, sin desarrollo activo, y su compatibilidad con Angular 22 no está garantizada.
- **Sí:** columnas por configuración (`TableColumn[]`) más template opcional (`appTableCell`). Cubre el caso simple y el personalizado sin acoplar a la estructura de la librería.
- **No:** solo templates. Obligaría al consumidor a conocer `mat-table`.
- **Sí:** `model()` y `output()` con tipos propios. Es lo que permite cambiar de librería sin tocar las features.
- **No:** re-exportar eventos o tipos de la librería. Filtraría el tipo a toda la app.
- **Sí:** variantes como uniones de strings. Los valores se mapean a la librería dentro del wrapper.
- **Sí:** orden y selección implementados en el wrapper. `MatTable` no los trae de forma completa (`MatSort` no admite orden múltiple y no hay selección por teclado), y así el comportamiento es independiente de la librería.
- **No:** usar `MatSort`. No cubre el orden múltiple.
- **Sí:** iconos como SVG inline. Evita depender de la fuente Material Icons de Google Fonts.
- **Sí:** tema de Material en un SCSS aparte. `styles.css` queda para Tailwind, que no se lleva bien con Sass.
- **Sí:** alcance de features limitado a la captura, priorizando lo más usado. Cualquier extra se añade invocando la misma skill.
- **No:** cubrir todo el catálogo de tablas ahora. Es demasiado grande para una spec.
- **Sí:** página demo `/ui/table`. Sirve de revisión visual y de base para el test de accesibilidad.

## Riesgos identificados

| Riesgo                                                                 | Mitigación                                                                                  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| La API propia no cubre un caso futuro de la librería                   | La skill define el flujo de ampliación del wrapper. No se expone Material como atajo.       |
| Angular Material 22 cambia nombres de tokens o de API respecto a la documentación | El plan revisa la API real instalada (`node_modules/@angular/material`) antes de mapear. |
| Contraste o foco insuficientes con el tema base                        | El criterio AXE/WCAG AA se verifica sobre la demo y se ajusta el estilo dentro del wrapper. |
| `mat-table` no trae selección por teclado ni densidad de tres niveles  | El wrapper implementa el teclado y la densidad con clases y tokens CSS, con tests.          |
| Conflicto de estilos entre Tailwind y Material                         | El tema de Material va en un SCSS aparte y se comprueba en la demo.                         |
| `selection` por radio/checkbox no encaja con el modelo único           | `selection` es `T \| T[] \| null` según `selectionMode`. Se documenta en la skill y se prueba. |
| Rehacer lo ya implementado con PrimeNG                                 | Los tipos, la directiva, la demo y la lógica de orden se reaprovechan. Nada está commiteado. |

## Lo que **no** está en esta spec

- Filter, paginator, expansión de filas, edición, lazy loading, virtual scroll, reorder, resize, export, columnas congeladas y agrupación de filas.
- Otros componentes de UI distintos de la tabla.
- Identidad visual propia más allá del tema base de Material.
- Migración a otra librería de UI distinta de Angular Material.
