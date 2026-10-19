import { Injectable, inject, signal } from '@angular/core';
import { Chart } from 'chart.js';
import { ThemeService as ChartThemeService } from 'ng2-charts';

const STORAGE_KEY = 'matrix.theme';

// Canvas charts cannot read the theme's CSS variables, so their text and grid
// take these tones: on-surface-variant and a step lighter than outline-variant.
const CHART_CHROME = {
  light: { text: '#44474c', grid: '#e1e2e9' },
  dark: { text: '#c5c6cd', grid: '#393b41' },
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(false);
  private readonly chartTheme = inject(ChartThemeService);

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
    document.documentElement.classList.toggle('dark-theme', this.isDark());

    const chrome = this.isDark() ? CHART_CHROME.dark : CHART_CHROME.light;
    Chart.defaults.color = chrome.text;
    Chart.defaults.borderColor = chrome.grid;
    // Chart.js copies scale defaults into a chart when it is built, so open charts
    // keep the old tones until ng2-charts re-merges their options; a fresh
    // overrides object is what triggers that.
    this.chartTheme.setColorschemesOptions({});
  }
}
