import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'matrix.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') {
      this.isDark.set(true);
    } else if (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.isDark.set(true);
    }
    this.apply();
  }

  toggle(): void {
    this.isDark.update((v) => !v);
    localStorage.setItem(STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    this.apply();
  }

  private apply(): void {
    document.documentElement.style.colorScheme = this.isDark() ? 'dark' : 'light';
  }
}
