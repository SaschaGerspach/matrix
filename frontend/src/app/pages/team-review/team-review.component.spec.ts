import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { TeamReviewComponent } from './team-review.component';

describe('TeamReviewComponent', () => {
  let fixture: ComponentFixture<TeamReviewComponent>;
  let component: TeamReviewComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamReviewComponent],
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

  it('loads pending assignments on init', () => {
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/team-assignments/?status=pending`);
    req.flush([
      { id: 1, employee: 2, employee_name: 'Alice A', skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', created_at: '2026-01-01' },
    ]);

    expect(component.data().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('shows empty state when no pending assignments', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/team-assignments/?status=pending`).flush([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No pending assignments to review');
  });

  it('confirms an assignment and reloads', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/team-assignments/?status=pending`).flush([
      { id: 5, employee: 2, employee_name: 'Alice A', skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', created_at: '2026-01-01' },
    ]);

    component.confirm(5);

    http.expectOne(`${environment.apiUrl}/skill-assignments/5/confirm/`).flush({});
    http.expectOne(`${environment.apiUrl}/team-assignments/?status=pending`).flush([]);

    expect(component.data().length).toBe(0);
  });
});
