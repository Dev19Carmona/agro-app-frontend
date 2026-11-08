import { Routes } from '@angular/router';
import { ALL_ROLES, placeholderRoute } from '../../core/routing/placeholder-route';

/** Montadas bajo `/catalogo`. Consulta pública: no pide sesión. */
export const CATALOGO_ROUTES: Routes = [
  placeholderRoute('', 'Catálogo', {
    roles: ALL_ROLES,
    description:
      'Productos de todas las tiendas, con filtro por categoría. Cada producto muestra sus presentaciones y el precio vigente (el de oferta si existe).',
    endpoints: ['GET /catalog/products', 'GET /catalog/categories'],
  }),
  placeholderRoute('productos/:id', 'Detalle de producto', {
    roles: ALL_ROLES,
    description:
      'Ficha técnica, presentaciones con precio y stock disponible, y botón para agregar al carrito. Los productos a cotizar no se pueden comprar.',
    endpoints: ['GET /catalog/products/:id'],
  }),
  placeholderRoute('ofertas', 'Ofertas', {
    roles: ALL_ROLES,
    description: 'Presentaciones con precio de oferta vigente.',
    endpoints: ['GET /catalog/offers'],
  }),
  placeholderRoute('tiendas', 'Tiendas', {
    roles: ALL_ROLES,
    description: 'Directorio de tiendas activas, con su municipio.',
    endpoints: ['GET /catalog/stores'],
  }),
  placeholderRoute('tiendas/:id', 'Detalle de tienda', {
    roles: ALL_ROLES,
    description: 'Datos de la tienda y sus productos.',
    endpoints: ['GET /catalog/stores/:id'],
  }),
];
