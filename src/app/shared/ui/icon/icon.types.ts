import type { ICON_PATHS } from './icon-paths';

/** Nombres de icono disponibles (los de `ICON_PATHS`). */
export type IconName = keyof typeof ICON_PATHS;

/** 16 px, 20 px y 24 px. */
export type IconSize = 'sm' | 'md' | 'lg';
