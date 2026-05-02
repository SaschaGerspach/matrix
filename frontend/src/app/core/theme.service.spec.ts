import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

function createService(): ThemeService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({});
  return TestBed.inject(ThemeService);
}

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark-theme');
  });

  it('respects explicit light preference from localStorage', () => {
    localStorage.setItem('matrix.theme', 'light');
    const service = createService();
    expect(service.isDark()).toBeFalse();
    expect(document.documentElement.classList.contains('dark-theme')).toBeFalse();
  });

  it('toggles theme', () => {
    localStorage.setItem('matrix.theme', 'light');
    const service = createService();
    const initial = service.isDark();
    service.toggle();
    expect(service.isDark()).toBe(!initial);
    service.toggle();
    expect(service.isDark()).toBe(initial);
  });

  it('persists toggle to localStorage', () => {
    localStorage.setItem('matrix.theme', 'light');
    const service = createService();
    service.toggle();
    expect(localStorage.getItem('matrix.theme')).toBe('dark');
    service.toggle();
    expect(localStorage.getItem('matrix.theme')).toBe('light');
  });

  it('toggles dark-theme class on document', () => {
    localStorage.setItem('matrix.theme', 'light');
    const service = createService();
    service.toggle();
    expect(document.documentElement.classList.contains('dark-theme')).toBeTrue();
    service.toggle();
    expect(document.documentElement.classList.contains('dark-theme')).toBeFalse();
  });

  it('restores dark mode from localStorage', () => {
    localStorage.setItem('matrix.theme', 'dark');
    const service = createService();
    expect(service.isDark()).toBeTrue();
    expect(document.documentElement.classList.contains('dark-theme')).toBeTrue();
  });
});
