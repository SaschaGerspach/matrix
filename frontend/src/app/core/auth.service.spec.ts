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

  it('sets loggedIn flag on successful login', () => {
    service.login('user', 'pw').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'user', password: 'pw' });
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ detail: 'ok' });

    expect(service.isLoggedIn()).toBeTrue();
    expect(localStorage.getItem('matrix.loggedIn')).toBe('1');
  });

  it('sends refresh with credentials', () => {
    service.refresh().subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/refresh/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({ detail: 'ok' });
  });

  it('clears session on logout', () => {
    localStorage.setItem('matrix.loggedIn', '1');

    service.logout().subscribe();
    const req = http.expectOne(`${environment.apiUrl}/auth/logout/`);
    expect(req.request.withCredentials).toBeTrue();
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('matrix.loggedIn')).toBeNull();
  });

  it('clears session even when logout fails', () => {
    localStorage.setItem('matrix.loggedIn', '1');

    service.logout().subscribe({ error: () => {} });
    http.expectOne(`${environment.apiUrl}/auth/logout/`).error(new ProgressEvent('network'));

    expect(service.isLoggedIn()).toBeFalse();
    expect(localStorage.getItem('matrix.loggedIn')).toBeNull();
  });
});
