import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CountUpDirective } from './count-up.directive';

@Component({
  standalone: true,
  imports: [CountUpDirective],
  template: '<span [appCountUp]="value"></span>',
})
class HostComponent {
  value = 3.5;
}

describe('CountUpDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
  });

  function target(): HTMLElement {
    return fixture.nativeElement.querySelector('span');
  }

  it('renders the final value immediately when reduced motion is preferred', () => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);

    fixture.detectChanges();

    expect(target().textContent).toBe('3.5');
  });

  it('keeps the decimal precision of the target value', (done) => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    fixture.componentInstance.value = 2;
    fixture.detectChanges();

    expect(target().textContent).toBe('2');
    done();
  });

  it('animates towards the target and lands exactly on it', (done) => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: false } as MediaQueryList);
    fixture.detectChanges();

    // The eased ramp starts below the target, so an intermediate frame proves it
    // animates rather than jumping.
    requestAnimationFrame(() => {
      expect(parseFloat(target().textContent!)).toBeLessThan(3.5);

      setTimeout(() => {
        expect(target().textContent).toBe('3.5');
        done();
      }, 800);
    });
  });
});
