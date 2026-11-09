import { Routes } from '@angular/router';
import { ALL_ROLES } from '../../core/routing';

/** Montadas bajo `/catalogo`. Consulta pública: no pide sesión. */
export const CATALOGO_ROUTES: Routes = [
  {
    path: '',
    title: 'Catálogo',
    data: {
      roles: ALL_ROLES,
      description:
        'Productos de todas las tiendas, con filtro por categoría. Cada producto muestra sus presentaciones y el precio vigente (el de oferta si existe).',
      endpoints: ['GET /catalog/products', 'GET /catalog/categories'],
    },
    loadComponent: () => import('./pages/catalogo-list/catalogo-list').then((m) => m.CatalogoList),
  },
  {
    path: 'productos/:id',
    title: 'Detalle de producto',
    data: {
      roles: ALL_ROLES,
      description:
        'Ficha técnica, presentaciones con precio y stock disponible, y botón para agregar al carrito. Los productos a cotizar no se pueden comprar.',
      endpoints: ['GET /catalog/products/:id'],
    },
    loadComponent: () =>
      import('./pages/producto-detalle/producto-detalle').then((m) => m.ProductoDetalle),
  },
  {
    path: 'ofertas',
    title: 'Ofertas',
    data: {
      roles: ALL_ROLES,
      description: 'Presentaciones con precio de oferta vigente.',
      endpoints: ['GET /catalog/offers'],
    },
    loadComponent: () => import('./pages/ofertas/ofertas').then((m) => m.Ofertas),
  },
  {
    path: 'tiendas',
    title: 'Tiendas',
    data: {
      roles: ALL_ROLES,
      description: 'Directorio de tiendas activas, con su municipio.',
      endpoints: ['GET /catalog/stores'],
    },
    loadComponent: () => import('./pages/tiendas/tiendas').then((m) => m.Tiendas),
  },
  {
    path: 'tiendas/:id',
    title: 'Detalle de tienda',
    data: {
      roles: ALL_ROLES,
      description: 'Datos de la tienda y sus productos.',
      endpoints: ['GET /catalog/stores/:id'],
    },
    loadComponent: () =>
      import('./pages/tienda-detalle/tienda-detalle').then((m) => m.TiendaDetalle),
  },
];
