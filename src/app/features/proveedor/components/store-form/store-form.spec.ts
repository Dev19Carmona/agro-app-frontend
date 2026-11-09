import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MyStore } from '../../models/proveedor.types';
import { StoreForm } from './store-form';

const STORE: MyStore = {
  id: '507f1f77bcf86cd799439011',
  nombre: 'Agro Sur',
  nit: '900123',
  ownerId: '507f1f77bcf86cd799439012',
  municipio: 'Bello',
  activa: true,
  createdAt: '2026-11-08T10:00:00.000Z',
};

function setup() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(StoreForm);
  const created: MyStore[] = [];
  fixture.componentInstance.created.subscribe((s) => created.push(s));
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const inputs = () => Array.from(el.querySelectorAll('input'));
  const settle = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const fill = async (nombre = 'Agro Sur', nit = '900123', municipio = 'Bello') => {
    [nombre, nit, municipio].forEach((text, i) => {
      inputs()[i].value = text;
      inputs()[i].dispatchEvent(new Event('input'));
    });
    await settle();
  };
  const send = async () => {
    (el.querySelector('button[type="submit"]') as HTMLButtonElement).click();
    await settle();
  };
  return { el, fill, send, settle, inputs, created, http: TestBed.inject(HttpTestingController) };
}

describe('StoreForm', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('tiene los tres campos', () => {
    const { inputs } = setup();
    expect(inputs().length).toBe(3);
  });

  it('con todo vacío no envía y muestra un error por campo', async () => {
    const { el, send, http } = setup();
    await send();
    http.expectNone('/api/catalog/stores');
    expect(Array.from(el.querySelectorAll('mat-error')).map((e) => e.textContent?.trim())).toEqual([
      'Escribe el nombre de la tienda',
      'Escribe el NIT',
      'Escribe el municipio',
    ]);
  });

  it('un nombre de 121 caracteres no se envía', async () => {
    const { el, fill, send, http } = setup();
    await fill('a'.repeat(121));
    await send();
    http.expectNone('/api/catalog/stores');
    expect(el.querySelector('mat-error')?.textContent).toContain('Máximo 120');
  });

  it('con datos válidos hace POST sin storeId y emite la tienda creada', async () => {
    const { fill, send, settle, created, http } = setup();
    await fill('  Agro Sur ', ' 900123 ', 'Bello');
    await send();
    const req = http.expectOne('/api/catalog/stores');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Agro Sur', nit: '900123', municipio: 'Bello' });
    req.flush(STORE);
    await settle();
    expect(created).toEqual([STORE]);
  });

  it('un 409 muestra el mensaje del backend y conserva lo escrito', async () => {
    const { el, fill, send, settle, inputs, created, http } = setup();
    await fill();
    await send();
    http
      .expectOne('/api/catalog/stores')
      .flush(
        { statusCode: 409, message: 'El NIT ya está registrado' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();
    expect(el.querySelector('app-alert')?.textContent).toContain('El NIT ya está registrado');
    expect(inputs()[1].value).toBe('900123');
    expect(created).toEqual([]);
    expect((el.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('mientras envía deshabilita el botón y no permite un segundo envío', async () => {
    const { el, fill, send, http } = setup();
    await fill();
    await send();
    const button = el.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    http.expectOne('/api/catalog/stores');
    http.expectNone('/api/catalog/stores');
  });
});
