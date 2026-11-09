import {
  isObjectId,
  validateOffer,
  validatePrice,
  validateRequiredText,
  validateStock,
} from './product-validation';

describe('product-validation', () => {
  it('isObjectId acepta 24 caracteres hexadecimales', () => {
    expect(isObjectId('507f1f77bcf86cd799439011')).toBe(true);
    expect(isObjectId('abc')).toBe(false);
    expect(isObjectId('zzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false);
  });

  it('validateRequiredText exige 1 a max caracteres sin contar los extremos', () => {
    expect(validateRequiredText('   ', 'el nombre', 10)).toBe('Escribe el nombre');
    expect(validateRequiredText(' ok ', 'el nombre', 10)).toBeNull();
    expect(validateRequiredText('a'.repeat(11), 'el nombre', 10)).toBe('Máximo 10 caracteres');
  });

  it('validatePrice exige un entero mayor que 0', () => {
    expect(validatePrice(null)).not.toBeNull();
    expect(validatePrice(0)).not.toBeNull();
    expect(validatePrice(1.5)).not.toBeNull();
    expect(validatePrice(1000)).toBeNull();
  });

  it('validateOffer es opcional y debe ser menor que el precio', () => {
    expect(validateOffer(null, 1000)).toBeNull();
    expect(validateOffer(900, 1000)).toBeNull();
    expect(validateOffer(1000, 1000)).not.toBeNull();
    expect(validateOffer(1200, 1000)).not.toBeNull();
    expect(validateOffer(0, 1000)).not.toBeNull();
    expect(validateOffer(2.5, 1000)).not.toBeNull();
  });

  it('validateStock exige un entero >= 0 y >= lo reservado', () => {
    expect(validateStock(null)).not.toBeNull();
    expect(validateStock(-1)).not.toBeNull();
    expect(validateStock(1.2)).not.toBeNull();
    expect(validateStock(0)).toBeNull();
    expect(validateStock(5, 5)).toBeNull();
    expect(validateStock(4, 5)).toContain('reservado');
  });
});
