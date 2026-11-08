import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';
import { BadgeTone } from './badge.types';

@Component({
  imports: [Badge],
  template: `<app-badge [tone]="tone">Pago aprobado</app-badge>`,
})
class Host {
  tone: BadgeTone = 'neutral';
}

function setup(tone?: BadgeTone) {
  const fixture = TestBed.createComponent(Host);
  if (tone) fixture.componentInstance.tone = tone;
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('app-badge') as HTMLElement;
}

describe('Badge', () => {
  it('renderiza el texto y es pill', () => {
    const el = setup();
    expect(el.textContent).toContain('Pago aprobado');
    expect(el.classList.contains('rounded-pill')).toBe(true);
  });

  it('usa el tono neutral por defecto', () => {
    expect(setup().classList.contains('bg-sunken')).toBe(true);
  });

  it.each<[BadgeTone, string]>([
    ['neutral', 'bg-sunken'],
    ['success', 'bg-brand-soft'],
    ['warning', 'text-warning'],
    ['danger', 'text-danger'],
    ['info', 'bg-info/15'],
  ])('tone %s aplica %s', (tone, cls) => {
    expect(setup(tone).classList.contains(cls)).toBe(true);
  });
});
