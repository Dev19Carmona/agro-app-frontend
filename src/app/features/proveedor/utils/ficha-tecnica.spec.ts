import { FichaRow } from '../models/proveedor.types';
import { fichaToRows, rowsToFicha, validateFicha } from './ficha-tecnica';

const row = (clave: string, valor: string): FichaRow => ({ clave, valor });

describe('ficha técnica', () => {
  it('convierte un Record a filas y de vuelta', () => {
    const ficha = { Nitrógeno: '10%', Peso: '50 kg' };
    expect(fichaToRows(ficha)).toEqual([row('Nitrógeno', '10%'), row('Peso', '50 kg')]);
    expect(rowsToFicha(fichaToRows(ficha))).toEqual(ficha);
  });

  it('rowsToFicha recorta la clave e ignora las filas totalmente vacías', () => {
    expect(rowsToFicha([row('  Peso ', '50 kg'), row('', ''), row('  ', '  ')])).toEqual({
      Peso: '50 kg',
    });
  });

  it('una ficha válida no tiene problemas', () => {
    expect(validateFicha([row('Peso', '50 kg'), row('Color', 'Verde'), row('', '')])).toEqual([]);
  });

  it('una clave vacía con valor es un problema de esa fila', () => {
    expect(validateFicha([row('Peso', '1'), row('', 'algo')])).toEqual([
      { row: 1, message: 'La clave no puede estar vacía' },
    ]);
  });

  it('una clave repetida con otra capitalización marca la segunda fila', () => {
    const issues = validateFicha([row('Peso', '1'), row('peso', '2')]);
    expect(issues).toHaveLength(1);
    expect(issues[0].row).toBe(1);
    expect(issues[0].message).toContain('repetida');
  });

  it('una clave de 51 caracteres es un problema', () => {
    expect(validateFicha([row('a'.repeat(50), 'x')])).toEqual([]);
    expect(validateFicha([row('a'.repeat(51), 'x')])[0].message).toContain('50');
  });

  it('un valor de 501 caracteres es un problema', () => {
    expect(validateFicha([row('k', 'v'.repeat(500))])).toEqual([]);
    expect(validateFicha([row('k', 'v'.repeat(501))])[0].message).toContain('500');
  });

  it('más de 30 entradas es un problema del conjunto', () => {
    const rows = Array.from({ length: 31 }, (_, i) => row(`clave${i}`, 'v'));
    expect(validateFicha(rows.slice(0, 30))).toEqual([]);
    expect(validateFicha(rows)).toEqual([{ row: null, message: 'La ficha admite hasta 30 entradas' }]);
  });
});
