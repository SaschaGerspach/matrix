import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('stores the token on successful login', () => {
    service.login('user', 'pw').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'user', password: 'pw' });
    req.flush({ token: 'abc123' });

    expect(service.getToken()).toBe('abc123');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('clears the token on logout', () => {
    localStorage.setItem('matrix.authToken', 'abc123');
    expect(service.isLoggedIn()).toBeTrue();

    service.logout().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/logout/`).flush(null, { status: 204, statusText: 'No Content' });

    expect(service.getToken()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('clears the token even when logout fails', () => {
    localStorage.setItem('matrix.authToken', 'abc123');

    service.logout().subscribe({ error: () => {} });
    http.expectOne(`${environment.apiUrl}/auth/logout/`).error(new ProgressEvent('network'));

    expect(service.getToken()).toBeNull();
  });
});
