import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

function runGuard(): boolean | UrlTree {
  return TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  ) as boolean | UrlTree;
}

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => localStorage.clear());

  it('allows activation when the user is logged in', () => {
    spyOn(TestBed.inject(AuthService), 'isLoggedIn').and.returnValue(true);
    expect(runGuard()).toBeTrue();
  });

  it('redirects to /login when the user is not logged in', () => {
    spyOn(TestBed.inject(AuthService), 'isLoggedIn').and.returnValue(false);
    const result = runGuard();
    expect(result).toEqual(TestBed.inject(Router).createUrlTree(['/login']));
  });
});
