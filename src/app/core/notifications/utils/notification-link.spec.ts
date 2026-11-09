import { notificationLink } from './notification-link';

const ORDER_ID = '64f0c0a1b2c3d4e5f6a7b8c9';

describe('notificationLink', () => {
  it('el productor va al detalle de su pedido', () => {
    expect(notificationLink(ORDER_ID, 'PRODUCTOR')).toBe(`/pedidos/${ORDER_ID}`);
  });

  it('el proveedor va a la lista de pedidos recibidos', () => {
    expect(notificationLink(ORDER_ID, 'PROVEEDOR')).toBe('/proveedor/pedidos');
  });

  it('sin orderId no hay enlace', () => {
    expect(notificationLink(null, 'PRODUCTOR')).toBeNull();
    expect(notificationLink(null, 'PROVEEDOR')).toBeNull();
  });

  it.each(['', 'abc', '64f0c0a1b2c3d4e5f6a7b8', '64f0c0a1b2c3d4e5f6a7b8cz', '../admin/usuarios'])(
    'un orderId inválido (%j) no genera enlace',
    (orderId) => {
      expect(notificationLink(orderId, 'PRODUCTOR')).toBeNull();
    },
  );

  it('ADMIN y VISITANTE no tienen enlace', () => {
    expect(notificationLink(ORDER_ID, 'ADMIN')).toBeNull();
    expect(notificationLink(ORDER_ID, 'VISITANTE')).toBeNull();
  });
});
