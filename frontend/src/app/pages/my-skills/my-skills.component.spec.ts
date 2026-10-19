import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { MySkillsComponent } from './my-skills.component';

function flushInit(http: HttpTestingController, skills: unknown[] = [], recommendations: unknown[] = []): void {
  http.expectOne(`${environment.apiUrl}/my-skills/`).flush(skills);
  http.expectOne(`${environment.apiUrl}/skill-recommendations/`).flush(recommendations);
}

describe('MySkillsComponent', () => {
  let fixture: ComponentFixture<MySkillsComponent>;
  let component: MySkillsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MySkillsComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MySkillsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads my skills on init', () => {
    fixture.detectChanges();
    flushInit(http, [
      { id: 1, skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', confirmed_at: null, created_at: '2026-01-01' },
    ]);

    expect(component.data().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('uses the singular subtitle for one assessed skill', () => {
    fixture.detectChanges();
    flushInit(http, [
      { id: 1, skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', confirmed_at: null, created_at: '2026-01-01' },
    ]);
    fixture.detectChanges();

    const subtitle = (fixture.nativeElement as HTMLElement).querySelector('.page-subtitle');
    expect(subtitle?.textContent?.trim()).toBe('1 skill assessed');
  });

  it('shows the assignment status as translated text', () => {
    fixture.detectChanges();
    flushInit(http, [
      { id: 1, skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', confirmed_at: null, created_at: '2026-01-01' },
    ]);
    fixture.detectChanges();

    const pill = (fixture.nativeElement as HTMLElement).querySelector('.status-pill');
    expect(pill?.textContent?.trim()).toBe('Pending');
  });

  it('shows empty state when no skills', () => {
    fixture.detectChanges();
    flushInit(http);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No skills assigned yet');
  });

  it('shows recommendations when available', () => {
    fixture.detectChanges();
    flushInit(http, [], [
      {
        skill_id: 1, skill_name: 'Docker', category_name: 'Ops',
        team_name: 'Alpha', current_level: 0, required_level: 3,
        gap: 3, priority: 'high',
      },
    ]);
    fixture.detectChanges();

    expect(component.recommendations().length).toBe(1);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Recommendations');
    expect(el.textContent).toContain('Docker');
  });

  it('marks current and missing levels on the recommendation track', () => {
    fixture.detectChanges();
    flushInit(http, [], [
      {
        skill_id: 1, skill_name: 'Docker', category_name: 'Ops',
        team_name: 'Alpha', current_level: 2, required_level: 4,
        gap: 2, priority: 'medium',
      },
    ]);
    fixture.detectChanges();

    const steps = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.level-step'));
    expect(steps.map((s) => s.getAttribute('data-heat'))).toEqual(['2', '2', null, null, null]);
    expect(steps.map((s) => s.classList.contains('level-step-need'))).toEqual([false, false, true, true, false]);
  });

  it('hides recommendations when empty', () => {
    fixture.detectChanges();
    flushInit(http);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Recommendations');
  });
});
