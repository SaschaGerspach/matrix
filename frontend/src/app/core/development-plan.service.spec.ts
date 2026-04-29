import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { DevelopmentPlanService } from './development-plan.service';

describe('DevelopmentPlanService', () => {
  let service: DevelopmentPlanService;
  let http: HttpTestingController;

  const mockPlan = {
    id: 1, employee: 1, employee_name: 'Alice A', title: 'Q3 Plan',
    notes: '', goals: [], created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const mockGoal = {
    id: 1, plan: 1, skill: 1, skill_name: 'Python', category_name: 'Programming',
    current_level: 2, target_level: 4, target_date: null, status: 'open' as const,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DevelopmentPlanService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists plans without filter', () => {
    service.listPlans().subscribe((res) => {
      expect(res.results.length).toBe(1);
    });

    const req = http.expectOne(`${environment.apiUrl}/development-plans/`);
    expect(req.request.method).toBe('GET');
    req.flush({ count: 1, next: null, previous: null, results: [mockPlan] });
  });

  it('lists plans filtered by employee', () => {
    service.listPlans(5).subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/development-plans/` && r.params.get('employee') === '5');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('gets a single plan', () => {
    service.getPlan(1).subscribe((plan) => {
      expect(plan.title).toBe('Q3 Plan');
    });

    const req = http.expectOne(`${environment.apiUrl}/development-plans/1/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPlan);
  });

  it('creates a plan', () => {
    service.createPlan(1, 'New Plan', 'Notes').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/development-plans/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ employee: 1, title: 'New Plan', notes: 'Notes' });
    req.flush(mockPlan);
  });

  it('updates a plan', () => {
    service.updatePlan(1, { title: 'Updated' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/development-plans/1/`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockPlan);
  });

  it('deletes a plan', () => {
    service.deletePlan(1).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/development-plans/1/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('creates a goal', () => {
    service.createGoal({ plan: 1, skill: 1, current_level: 2, target_level: 4 }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/development-goals/`);
    expect(req.request.method).toBe('POST');
    req.flush(mockGoal);
  });

  it('updates a goal', () => {
    service.updateGoal(1, { status: 'in_progress' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/development-goals/1/`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockGoal);
  });

  it('deletes a goal', () => {
    service.deleteGoal(1).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/development-goals/1/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
