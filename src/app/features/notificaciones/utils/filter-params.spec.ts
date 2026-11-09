import { convertToParamMap } from '@angular/router';
import { notificationsFilterQuery, parseNotificationsFilter } from './filter-params';

const parse = (params: Record<string, string>) =>
  parseNotificationsFilter(convertToParamMap(params));

describe('parseNotificationsFilter', () => {
  it('sin parámetros es «todas»', () => {
    expect(parse({})).toBe('todas');
  });

  it('acepta no-leidas', () => {
    expect(parse({ filtro: 'no-leidas' })).toBe('no-leidas');
  });

  it.each(['todas', 'leidas', 'NO-LEIDAS', '', 'no-leidas ', '1'])(
    'un valor distinto (%j) cae en «todas»',
    (filtro) => {
      expect(parse({ filtro })).toBe('todas');
    },
  );
});

describe('notificationsFilterQuery', () => {
  it('no escribe el valor por defecto', () => {
    expect(notificationsFilterQuery('todas')).toEqual({});
  });

  it('escribe no-leidas', () => {
    expect(notificationsFilterQuery('no-leidas')).toEqual({ filtro: 'no-leidas' });
  });
});
