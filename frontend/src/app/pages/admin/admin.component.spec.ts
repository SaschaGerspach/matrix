import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/toast.service';
import { AdminComponent } from './admin.component';

function flushInitRequests(http: HttpTestingController): void {
  http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([
    { id: 1, name: 'Programming', parent: null },
  ]);
  http.expectOne(`${environment.apiUrl}/skills/`).flush([
    { id: 1, name: 'Python', category: 1 },
  ]);
  http.expectOne(`${environment.apiUrl}/teams/`).flush([
    {
      id: 1, name: 'Core', department: 1, members: [1], team_leads: [2],
      member_details: [{ id: 1, full_name: 'Alice A' }, { id: 2, full_name: 'Bob B' }],
      lead_details: [{ id: 2, full_name: 'Bob B' }],
    },
  ]);
  http.expectOne(`${environment.apiUrl}/skill-requirements/`).flush([]);
  http.expectOne(`${environment.apiUrl}/skill-level-descriptions/`).flush([]);
  http.expectOne(`${environment.apiUrl}/audit-log/`).flush({ count: 0, next: null, previous: null, results: [] });
  http.expectOne(`${environment.apiUrl}/role-templates/`).flush([]);
}

describe('AdminComponent', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let component: AdminComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads all data on init', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    expect(component.categories().length).toBe(1);
    expect(component.skills().length).toBe(1);
    expect(component.teams().length).toBe(1);
  });

  it('warns about teams that have members but no lead', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([{ id: 1, name: 'Programming', parent: null }]);
    http.expectOne(`${environment.apiUrl}/skills/`).flush([{ id: 1, name: 'Python', category: 1 }]);
    http.expectOne(`${environment.apiUrl}/teams/`).flush([
      {
      id: 1, name: 'Core', department: 1, members: [1], team_leads: [2],
      member_details: [{ id: 1, full_name: 'Alice A' }, { id: 2, full_name: 'Bob B' }],
      lead_details: [{ id: 2, full_name: 'Bob B' }],
    },
      {
        id: 2, name: 'Frontend', department: 1, members: [3], team_leads: [],
        member_details: [{ id: 3, full_name: 'Carol C' }], lead_details: [],
      },
      {
        id: 3, name: 'Empty', department: 1, members: [], team_leads: [],
        member_details: [], lead_details: [],
      },
    ]);
    http.expectOne(`${environment.apiUrl}/skill-requirements/`).flush([]);
    http.expectOne(`${environment.apiUrl}/skill-level-descriptions/`).flush([]);
    http.expectOne(`${environment.apiUrl}/audit-log/`).flush({ count: 0, next: null, previous: null, results: [] });
    http.expectOne(`${environment.apiUrl}/role-templates/`).flush([]);
    fixture.detectChanges();

    // An empty team blocks nothing, so it must not be reported.
    expect(component.teamsWithoutLead().map((t) => t.name)).toEqual(['Frontend']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Some teams have no lead');
  });

  it('stays quiet when every team with members has a lead', () => {
    fixture.detectChanges();
    flushInitRequests(http);
    fixture.detectChanges();

    expect(component.teamsWithoutLead().length).toBe(0);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Some teams have no lead');
  });

  it('offers only members who are not already a lead', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    const team = component.teams()[0];
    expect(component.assignableMembers(team).map((m) => m.full_name)).toEqual(['Alice A']);
  });

  it('assigns a lead and keeps the existing ones', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.addLead(component.teams()[0], 1);

    const req = http.expectOne(`${environment.apiUrl}/teams/1/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ team_leads: [2, 1] });
    req.flush({
      id: 1, name: 'Core', department: 1, members: [1], team_leads: [2, 1],
      member_details: [{ id: 1, full_name: 'Alice A' }, { id: 2, full_name: 'Bob B' }],
      lead_details: [{ id: 2, full_name: 'Bob B' }, { id: 1, full_name: 'Alice A' }],
    });

    expect(component.teams()[0].lead_details.length).toBe(2);
  });

  it('removes a lead', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.removeLead(component.teams()[0], 2);

    const req = http.expectOne(`${environment.apiUrl}/teams/1/`);
    expect(req.request.body).toEqual({ team_leads: [] });
    req.flush({
      id: 1, name: 'Core', department: 1, members: [1], team_leads: [],
      member_details: [{ id: 1, full_name: 'Alice A' }], lead_details: [],
    });

    expect(component.teams()[0].lead_details.length).toBe(0);
  });

  it('reports a duplicate skill name instead of a generic failure', () => {
    const toast = TestBed.inject(ToastService);
    const errorSpy = spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitRequests(http);

    component.newSkillName = 'python';
    component.newSkillCategory = 1;
    component.addSkill();

    http.expectOne(`${environment.apiUrl}/skills/`).flush(
      { name: ['A skill with this name already exists in this category.'] },
      { status: 400, statusText: 'Bad Request' },
    );
    http.expectOne(`${environment.apiUrl}/skills/`).flush([{ id: 1, name: 'Python', category: 1 }]);

    expect(errorSpy).toHaveBeenCalledWith('TOAST.SKILL_DUPLICATE');
  });

  it('still reports unexpected failures generically', () => {
    const toast = TestBed.inject(ToastService);
    const errorSpy = spyOn(toast, 'error');
    fixture.detectChanges();
    flushInitRequests(http);

    component.newSkillName = 'Rust';
    component.newSkillCategory = 1;
    component.addSkill();

    http.expectOne(`${environment.apiUrl}/skills/`).flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne(`${environment.apiUrl}/skills/`).flush([{ id: 1, name: 'Python', category: 1 }]);

    expect(errorSpy).toHaveBeenCalledWith('TOAST.ERROR');
  });

  it('adds a category', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.newCategoryName = 'Ops';
    component.addCategory();

    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush({ id: 2, name: 'Ops', parent: null });
    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([
      { id: 1, name: 'Programming', parent: null },
      { id: 2, name: 'Ops', parent: null },
    ]);

    expect(component.categories().length).toBe(2);
    expect(component.newCategoryName).toBe('');
  });

  it('deletes a category', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.deleteCategory(1);

    http.expectOne(`${environment.apiUrl}/skill-categories/1/`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([]);

    expect(component.categories().length).toBe(0);
  });
});
