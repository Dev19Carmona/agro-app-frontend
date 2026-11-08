import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Card } from './card';
import { CardPadding, CardTone } from './card.types';

@Component({
  imports: [Card],
  template: `<app-card [padding]="padding" [tone]="tone"><p>Contenido</p></app-card>`,
})
class Host {
  padding: CardPadding = 'md';
  tone: CardTone = 'default';
}

function setup(patch: Partial<Host> = {}) {
  const fixture = TestBed.createComponent(Host);
  Object.assign(fixture.componentInstance, patch);
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('app-card') as HTMLElement;
}

describe('Card', () => {
  it('proyecta el contenido y tiene esquinas redondeadas', () => {
    const el = setup();
    expect(el.textContent).toContain('Contenido');
    expect(el.classList.contains('rounded-xl')).toBe(true);
    expect(el.classList.contains('border')).toBe(true);
  });

  it.each<[CardPadding, string | null]>([
    ['none', null],
    ['sm', 'p-3'],
    ['md', 'p-4'],
    ['lg', 'p-6'],
  ])('padding %s', (padding, cls) => {
    const el = setup({ padding });
    if (cls) {
      expect(el.classList.contains(cls)).toBe(true);
    } else {
      expect([...el.classList].some((c) => c.startsWith('p-'))).toBe(false);
    }
  });

  it.each<[CardTone, string]>([
    ['default', 'bg-surface'],
    ['sunken', 'bg-sunken'],
  ])('tone %s aplica %s', (tone, cls) => {
    expect(setup({ tone }).classList.contains(cls)).toBe(true);
  });
});
