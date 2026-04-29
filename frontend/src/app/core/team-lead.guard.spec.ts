import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { teamLeadGuard } from './team-lead.guard';
import { MeProfile, MeService } from './me.service';

function runGuard(): Observable<boolean | UrlTree> {
  return TestBed.runInInjectionContext(() =>
    teamLeadGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as Observable<boolean | UrlTree>;
}

const baseProfile: MeProfile = {
  id: 1, first_name: 'A', last_name: 'B', full_name: 'A B',
  email: 'a@b.com', user: 1, is_team_lead: false, is_admin: false,
};

describe('teamLeadGuard', () => {
  let meService: MeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    meService = TestBed.inject(MeService);
  });

  it('allows activation for admins', (done) => {
    spyOn(meService, 'getProfile').and.returnValue(of({ ...baseProfile, is_admin: true }));
    runGuard().subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('allows activation for team leads', (done) => {
    spyOn(meService, 'getProfile').and.returnValue(of({ ...baseProfile, is_team_lead: true }));
    runGuard().subscribe((result) => {
      expect(result).toBeTrue();
      done();
    });
  });

  it('redirects regular users to /my-skills', (done) => {
    spyOn(meService, 'getProfile').and.returnValue(of(baseProfile));
    runGuard().subscribe((result) => {
      const expected = TestBed.inject(Router).createUrlTree(['/my-skills']);
      expect(result).toEqual(expected);
      done();
    });
  });
});
