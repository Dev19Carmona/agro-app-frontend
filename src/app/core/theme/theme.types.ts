/** Preferencia del usuario. `system` sigue `prefers-color-scheme`. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Tema realmente aplicado a la página. */
export type EffectiveTheme = 'light' | 'dark';

/** Clave de `localStorage` donde se guarda la preferencia. */
export const THEME_STORAGE_KEY = 'agro:theme';

/** Clase de `<html>` que activa el modo oscuro (Tailwind `dark:` y tema de Material). */
export const DARK_CLASS = 'app-dark';
