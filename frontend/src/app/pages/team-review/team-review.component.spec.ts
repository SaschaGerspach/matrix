import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { TeamAssignment } from '../../core/skill.models';
import { TeamReviewComponent } from './team-review.component';

const meProfile = {
  id: 1, first_name: 'A', last_name: 'B', full_name: 'A B',
  email: 'a@b.com', user: 1, is_team_lead: true, is_admin: false,
};

function assignment(overrides: Partial<TeamAssignment> = {}): TeamAssignment {
  return {
    id: 1, employee: 2, employee_name: 'Alice A', skill: 1, skill_name: 'Python',
    category_name: 'Programming', level: 3, status: 'pending', created_at: '2026-01-01',
    team_names: ['Core'], has_team_lead: true,
    ...overrides,
  };
}

describe('TeamReviewComponent', () => {
  let fixture: ComponentFixture<TeamReviewComponent>;
  let component: TeamReviewComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamReviewComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamReviewComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushInit(rows: TeamAssignment[], profile = meProfile): void {
    http.expectOne(`${environment.apiUrl}/team-assignments/?status=pending`).flush(rows);
    http.expectOne(`${environment.apiUrl}/me/`).flush(profile);
  }

  it('loads pending assignments on init', () => {
    fixture.detectChanges();
    flushInit([assignment()]);

    expect(component.data().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('shows empty state when no pending assignments', () => {
    fixture.detectChanges();
    flushInit([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No pending assignments to review');
  });

  it('confirms an assignment and reloads', () => {
    fixture.detectChanges();
    flushInit([assignment({ id: 5 })]);

    component.confirm(5);

    http.expectOne(`${environment.apiUrl}/skill-assignments/5/confirm/`).flush({});
    http.expectOne(`${environment.apiUrl}/team-assignments/?status=pending`).flush([]);

    expect(component.data().length).toBe(0);
  });

  it('counts only the rows no team lead owns', () => {
    fixture.detectChanges();
    flushInit([
      assignment({ id: 1, has_team_lead: true }),
      assignment({ id: 2, has_team_lead: false }),
      assignment({ id: 3, has_team_lead: false, team_names: [] }),
    ]);

    expect(component.unownedCount()).toBe(2);
  });

  it('marks rows whose team has no lead', () => {
    fixture.detectChanges();
    flushInit([assignment({ has_team_lead: false })]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.review-unowned')).toBeTruthy();
    expect(el.textContent).toContain('of these belong to a team with no lead');
  });

  it('keeps the admin banner away from a lead reviewing their own team', () => {
    fixture.detectChanges();
    flushInit([assignment()]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('because you are an admin');
    expect(el.querySelector('.review-unowned')).toBeFalsy();
  });

  it('explains the fallback to an admin who leads no team', () => {
    fixture.detectChanges();
    flushInit([assignment()], { ...meProfile, is_team_lead: false, is_admin: true });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('because you are an admin');
  });
});
