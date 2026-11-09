import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Toast } from './toast';
import { ToastService } from './toast-service';
import { TOAST_DURATION_MS, TOAST_MAX_VISIBLE } from './toast.types';

function setup() {
  TestBed.configureTestingModule({ imports: [Toast], providers: [provideRouter([])] });
  const fixture = TestBed.createComponent(Toast);
  const service = TestBed.inject(ToastService);
  const el = fixture.nativeElement as HTMLElement;
  const render = () => {
    fixture.detectChanges();
    return Array.from(el.querySelectorAll('li'));
  };
  return { fixture, service, el, render };
}

describe('ToastService y Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra título y mensaje como texto', () => {
    const { service, render } = setup();
    service.show({ title: '<b>Hola</b>', message: 'Mensaje' });
    const [li] = render();
    expect(li.textContent).toContain('<b>Hola</b>');
    expect(li.querySelector('b')).toBeNull();
    expect(li.textContent).toContain('Mensaje');
  });

  it('usa role=status y aria-live=polite; danger usa role=alert', () => {
    const { service, render } = setup();
    service.show({ title: 'Uno', tone: 'info' });
    service.show({ title: 'Dos', tone: 'danger' });
    const [a, b] = render();
    expect(a.getAttribute('role')).toBe('status');
    expect(a.getAttribute('aria-live')).toBe('polite');
    expect(b.getAttribute('role')).toBe('alert');
  });

  it('se cierra solo a los 6 s', () => {
    const { service, render } = setup();
    service.show({ title: 'Uno' });
    expect(render().length).toBe(1);
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    expect(render().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(render().length).toBe(0);
  });

  it('el plazo se pausa con el puntero encima y continúa al salir', () => {
    const { service, render } = setup();
    service.show({ title: 'Uno' });
    const [li] = render();
    vi.advanceTimersByTime(4000);
    li.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(10_000);
    expect(render().length).toBe(1);
    li.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(1999);
    expect(render().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(render().length).toBe(0);
  });

  it('el plazo se pausa con el foco dentro', () => {
    const { service, render } = setup();
    service.show({ title: 'Uno' });
    const [li] = render();
    li.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(20_000);
    expect(render().length).toBe(1);
    li.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(render().length).toBe(0);
  });

  it('el botón de cerrar tiene nombre accesible y quita el toast', () => {
    const { service, el, render } = setup();
    service.show({ title: 'Uno' });
    render();
    const close = el.querySelector('button') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Cerrar aviso');
    close.click();
    expect(render().length).toBe(0);
  });

  it('no roba el foco al aparecer', () => {
    const { service, render } = setup();
    const before = document.activeElement;
    service.show({ title: 'Uno' });
    render();
    expect(document.activeElement).toBe(before);
  });

  it('descarta los más antiguos al pasar del máximo', () => {
    const { service } = setup();
    for (let i = 0; i < TOAST_MAX_VISIBLE + 2; i++) {
      service.show({ title: `T${i}` });
    }
    const titles = service.toasts().map((t) => t.title);
    expect(titles.length).toBe(TOAST_MAX_VISIBLE);
    expect(titles[0]).toBe('T2');
  });

  it('pinta el enlace con su destino', () => {
    const { service, el, render } = setup();
    service.show({ title: 'y 3 avisos más', link: { label: 'Ver todas', url: '/notificaciones' } });
    render();
    const a = el.querySelector('a') as HTMLAnchorElement;
    expect(a.textContent).toContain('Ver todas');
    expect(a.getAttribute('href')).toBe('/notificaciones');
  });

  it('clear vacía la cola y dismiss de un id ajeno no falla', () => {
    const { service, render } = setup();
    service.show({ title: 'Uno' });
    service.show({ title: 'Dos' });
    service.dismiss(9999);
    service.clear();
    expect(render().length).toBe(0);
  });
});
