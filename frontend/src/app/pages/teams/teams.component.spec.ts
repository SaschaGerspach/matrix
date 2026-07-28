import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { Team } from '../../core/team.service';
import { TeamsComponent } from './teams.component';

const meLead = {
  id: 2, first_name: 'Bob', last_name: 'B', full_name: 'Bob B',
  email: 'b@x.com', user: 1, is_team_lead: true, is_admin: false,
};

function team(overrides: Partial<Team> = {}): Team {
  return {
    id: 1, name: 'Core', department: 1, members: [1], team_leads: [2],
    member_details: [{ id: 1, full_name: 'Alice A' }],
    lead_details: [{ id: 2, full_name: 'Bob B' }],
    ...overrides,
  };
}

describe('TeamsComponent', () => {
  let fixture: ComponentFixture<TeamsComponent>;
  let component: TeamsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamsComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushInit(teams: Team[], profile = meLead): void {
    http.expectOne(`${environment.apiUrl}/me/`).flush(profile);
    http.expectOne(`${environment.apiUrl}/teams/`).flush(teams);
  }

  it('shows a lead only the teams they lead', () => {
    fixture.detectChanges();
    flushInit([
      team({ id: 1, name: 'Core', team_leads: [2] }),
      team({ id: 2, name: 'Other', team_leads: [9], lead_details: [{ id: 9, full_name: 'Zoe Z' }] }),
    ]);

    expect(component.visibleTeams().map((t) => t.name)).toEqual(['Core']);
  });

  it('shows an admin every team', () => {
    fixture.detectChanges();
    flushInit(
      [team({ id: 1, name: 'Core' }), team({ id: 2, name: 'Other', team_leads: [9] })],
      { ...meLead, is_team_lead: false, is_admin: true },
    );

    expect(component.visibleTeams().length).toBe(2);
  });

  it('adds a member without dropping the existing ones', () => {
    fixture.detectChanges();
    flushInit([team()]);

    component.addMember(component.teams()[0], 5);

    const req = http.expectOne(`${environment.apiUrl}/teams/1/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ members: [1, 5] });
    req.flush(team({ members: [1, 5] }));

    expect(component.teams()[0].members).toEqual([1, 5]);
  });

  it('removes a member', () => {
    fixture.detectChanges();
    flushInit([team({ members: [1, 5] })]);

    component.removeMember(component.teams()[0], 1);

    const req = http.expectOne(`${environment.apiUrl}/teams/1/`);
    expect(req.request.body).toEqual({ members: [5] });
    req.flush(team({ members: [5] }));
  });

  it('searches for people to add, debounced', fakeAsync(() => {
    fixture.detectChanges();
    flushInit([team()]);

    component.onSearch('ali');
    tick(300);

    const req = http.expectOne((r) =>
      r.url === `${environment.apiUrl}/employees/` && r.params.get('search') === 'ali',
    );
    req.flush({
      count: 2, next: null, previous: null,
      results: [
        { id: 1, first_name: 'Alice', last_name: 'A', full_name: 'Alice A', email: 'a@x.com', user: null },
        { id: 6, first_name: 'Alina', last_name: 'B', full_name: 'Alina B', email: 'al@x.com', user: null },
      ],
    });

    // Alice is already in the team, so adding her would be a no-op.
    expect(component.candidatesFor(component.teams()[0]).map((e) => e.id)).toEqual([6]);
  }));

  it('warns when a visible team has members but no lead', () => {
    fixture.detectChanges();
    flushInit(
      [team({ team_leads: [], lead_details: [] })],
      { ...meLead, is_team_lead: false, is_admin: true },
    );
    fixture.detectChanges();

    expect(component.teamsWithoutLead().length).toBe(1);
    expect((fixture.nativeElement as HTMLElement).textContent)
      .toContain('have members but no lead');
  });

  it('hides lead editing from a lead', () => {
    fixture.detectChanges();
    flushInit([team()]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Add a lead');
    expect(el.textContent).toContain('Add member');
  });
});
