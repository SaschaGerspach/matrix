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
    const teams = [{ id: 1, name: 'Alpha', department: 1 }];
    service.list().subscribe((result) => {
      expect(result).toEqual(teams);
    });

    const req = http.expectOne(`${environment.apiUrl}/teams/`);
    expect(req.request.method).toBe('GET');
    req.flush(teams);
  });
});
