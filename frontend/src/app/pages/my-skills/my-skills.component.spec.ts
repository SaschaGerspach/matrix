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

  it('hides recommendations when empty', () => {
    fixture.detectChanges();
    flushInit(http);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Recommendations');
  });
});
