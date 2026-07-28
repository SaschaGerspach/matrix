import { DestroyRef, Directive, ElementRef, effect, inject, input } from '@angular/core';

const DURATION_MS = 600;

@Directive({
  selector: '[appCountUp]',
  standalone: true,
})
export class CountUpDirective {
  readonly appCountUp = input.required<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private frame: number | null = null;

  constructor() {
    effect(() => this.animateTo(this.appCountUp()));
    inject(DestroyRef).onDestroy(() => this.cancel());
  }

  private animateTo(target: number): void {
    this.cancel();

    // Keep the target's own precision so 3.5 does not render as 4.
    const decimals = (String(target).split('.')[1] ?? '').length;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.render(target, decimals);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.render(target * eased, decimals);
      this.frame = progress < 1 ? requestAnimationFrame(step) : null;
    };
    this.frame = requestAnimationFrame(step);
  }

  private render(value: number, decimals: number): void {
    this.host.nativeElement.textContent = value.toFixed(decimals);
  }

  private cancel(): void {
    if (this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
