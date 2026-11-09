import { TestBed } from '@angular/core/testing';
import { StockSummary } from './stock-summary';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(StockSummary);
  for (const [key, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(key, value);
  }
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StockSummary', () => {
  it('muestra stock total, reservado y disponible con su etiqueta', () => {
    const el = render({ stock: 20, reservado: 5, disponible: 15 });
    const pairs = Array.from(el.querySelectorAll('div')).map((d) => [
      d.querySelector('dt')?.textContent?.trim(),
      d.querySelector('dd')?.textContent?.trim(),
    ]);
    expect(pairs).toEqual([
      ['Stock total', '20'],
      ['Reservado', '5'],
      ['Disponible', '15'],
    ]);
  });

  it('en modo compacto resume los disponibles', () => {
    const el = render({ stock: 20, reservado: 5, disponible: 15, compact: true });
    expect(el.textContent).toContain('15 disponibles');
    expect(el.textContent).toContain('20 en total');
    expect(el.textContent).toContain('5 reservados');
  });

  it('en modo compacto 1 es singular y 0 es "Sin stock"', () => {
    expect(render({ stock: 1, reservado: 0, disponible: 1, compact: true }).textContent).toContain(
      '1 disponible',
    );
    expect(render({ stock: 3, reservado: 3, disponible: 0, compact: true }).textContent).toContain(
      'Sin stock',
    );
  });
});
