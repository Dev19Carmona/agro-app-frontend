import { Routes } from '@angular/router';
import { placeholderRoute } from '../../core/routing';

/** Montadas bajo `/proveedor`. Un proveedor administra una sola tienda. */
export const PROVEEDOR_ROUTES: Routes = [
  placeholderRoute('tienda', 'Mi tienda', {
    roles: ['PROVEEDOR'],
    description:
      'Datos de la tienda del proveedor. Si aún no tiene, formulario para crearla (una por proveedor).',
    endpoints: ['GET /catalog/my-store', 'POST /catalog/stores'],
  }),
  placeholderRoute('productos', 'Mis productos', {
    roles: ['PROVEEDOR'],
    description:
      'Productos de la tienda con su estado (activo o inactivo), presentaciones y stock disponible. Los productos no se borran, se desactivan.',
    endpoints: ['GET /catalog/my-store', 'GET /catalog/products'],
  }),
  placeholderRoute('productos/nuevo', 'Nuevo producto', {
    roles: ['PROVEEDOR'],
    description:
      'Formulario de producto: nombre, marca, categoría, ficha técnica e indicador de precio a cotizar.',
    endpoints: ['POST /catalog/products'],
  }),
  placeholderRoute('productos/:id', 'Editar producto', {
    roles: ['PROVEEDOR'],
    description:
      'Edición del producto y de sus presentaciones: precio entero en COP, precio de oferta menor al precio, y stock absoluto que no puede bajar de lo reservado.',
    endpoints: [
      'PATCH /catalog/products/:id',
      'POST /catalog/products/:id/variants',
      'PATCH /catalog/variants/:id',
      'PATCH /catalog/variants/:id/stock',
    ],
  }),
  placeholderRoute('pedidos', 'Pedidos recibidos', {
    roles: ['PROVEEDOR'],
    description:
      'Sub-pedidos de la tienda ya pagados, con estado y fecha. No muestra al comprador ni el total.',
    endpoints: ['GET /orders/provider/sub-orders'],
  }),
  placeholderRoute('pedidos/:id', 'Detalle de pedido recibido', {
    roles: ['PROVEEDOR'],
    description: 'Ítems del sub-pedido, su estado y el identificador del pedido.',
    endpoints: ['GET /orders/provider/sub-orders/:id'],
  }),
];
