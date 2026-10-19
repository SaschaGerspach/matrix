import { formatDate, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from './language.service';

registerLocaleData(localeDe);

// DatePipe is bound to LOCALE_ID at bootstrap; this one follows the language
// picked at runtime. Impure so a language switch re-renders, memoised so a
// change detection pass without a switch costs nothing.
@Pipe({ name: 'localDate', standalone: true, pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly lang = inject(LanguageService);
  private last: { value: unknown; format: string; locale: string; result: string | null } | null = null;

  transform(value: string | number | Date | null | undefined, format = 'mediumDate'): string | null {
    const locale = this.lang.currentLang();
    if (this.last && this.last.value === value && this.last.format === format && this.last.locale === locale) {
      return this.last.result;
    }
    const result = value === null || value === undefined || value === '' ? null : formatDate(value, format, locale);
    this.last = { value, format, locale, result };
    return result;
  }
}
