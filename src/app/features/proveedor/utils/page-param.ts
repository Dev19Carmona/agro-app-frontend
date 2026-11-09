/** Página de `?page=`: entero mayor o igual a 1; cualquier otro valor da 1. */
export function parsePage(value: string | null): number {
  if (value === null || !/^\d+$/.test(value)) {
    return 1;
  }
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Query params de la URL para una página; la 1 deja la URL limpia. */
export function pageQuery(page: number): Record<string, string> {
  return page > 1 ? { page: String(page) } : {};
}
