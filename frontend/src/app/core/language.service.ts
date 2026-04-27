import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

const STORAGE_KEY = 'matrix.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  readonly currentLang = signal('en');

  init(): void {
    this.translate.addLangs(['en', 'de']);
    const stored = localStorage.getItem(STORAGE_KEY);
    const lang = stored && ['en', 'de'].includes(stored) ? stored : 'en';
    this.translate.use(lang);
    this.currentLang.set(lang);
  }

  toggle(): void {
    const next = this.currentLang() === 'en' ? 'de' : 'en';
    this.translate.use(next);
    this.currentLang.set(next);
    localStorage.setItem(STORAGE_KEY, next);
  }
}
