/** Clave de `localStorage` del selector de rol de demo, eliminado en SPEC 03. */
const LEGACY_DEMO_ROLE_KEY = 'agro:demo-role';

/** Borra del navegador el rol de demo que dejó una versión anterior de la app. */
export function clearLegacyDemoRole(storage: Pick<Storage, 'removeItem'> | null = safeStorage()) {
  try {
    storage?.removeItem(LEGACY_DEMO_ROLE_KEY);
  } catch {
    // Sin almacenamiento: no hay nada que borrar.
  }
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}
