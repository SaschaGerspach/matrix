import { TestBed } from '@angular/core/testing';
import { TranslateTestingModule } from './testing/translate-testing';

import { LanguageService } from './language.service';
import { LocalDatePipe } from './local-date.pipe';

describe('LocalDatePipe', () => {
  let pipe: LocalDatePipe;
  let lang: LanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TranslateTestingModule], providers: [LocalDatePipe] });
    pipe = TestBed.inject(LocalDatePipe);
    lang = TestBed.inject(LanguageService);
  });

  afterEach(() => localStorage.removeItem('matrix.lang'));

  it('formats in the active UI language and follows a switch', () => {
    lang.currentLang.set('en');
    expect(pipe.transform('2026-07-30', 'mediumDate')).toBe('Jul 30, 2026');

    lang.currentLang.set('de');
    expect(pipe.transform('2026-07-30', 'mediumDate')).toBe('30.07.2026');
  });

  it('renders nothing for a missing date', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform('')).toBeNull();
  });
});
