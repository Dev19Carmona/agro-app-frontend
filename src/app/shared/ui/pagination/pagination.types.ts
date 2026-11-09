/** Elemento de la barra: un número de página o unos puntos suspensivos entre dos saltos. */
export type PaginationItem = { kind: 'page'; page: number } | { kind: 'gap'; key: string };
