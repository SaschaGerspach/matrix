import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { TeamService } from './team.service';

describe('TeamService', () => {
  let service: TeamService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TeamService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches the team list', () => {
    const teams = [{
      id: 1, name: 'Alpha', department: 1, members: [4], team_leads: [7],
      member_details: [{ id: 4, full_name: 'Dana D' }],
      lead_details: [{ id: 7, full_name: 'Erik E' }],
    }];
    service.list().subscribe((result) => {
      expect(result).toEqual(teams);
    });

    const req = http.expectOne(`${environment.apiUrl}/teams/`);
    expect(req.request.method).toBe('GET');
    req.flush(teams);
  });

  it('patches only the lead list when assigning a lead', () => {
    service.setLeads(1, [4, 7]).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/teams/1/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ team_leads: [4, 7] });
    req.flush({});
  });
});
