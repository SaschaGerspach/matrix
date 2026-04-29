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

  it('stores tokens on successful login', () => {
    service.login('user', 'pw').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'user', password: 'pw' });
    req.flush({ access: 'access123', refresh: 'refresh123' });

    expect(service.getToken()).toBe('access123');
    expect(service.getRefreshToken()).toBe('refresh123');
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('refreshes tokens', () => {
    localStorage.setItem('matrix.refreshToken', 'old-refresh');

    service.refresh().subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/refresh/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh: 'old-refresh' });
    req.flush({ access: 'new-access', refresh: 'new-refresh' });

    expect(service.getToken()).toBe('new-access');
    expect(service.getRefreshToken()).toBe('new-refresh');
  });

  it('clears tokens on logout', () => {
    localStorage.setItem('matrix.accessToken', 'access123');
    localStorage.setItem('matrix.refreshToken', 'refresh123');
    expect(service.isLoggedIn()).toBeTrue();

    service.logout().subscribe();
    http.expectOne(`${environment.apiUrl}/auth/logout/`).flush(null, { status: 204, statusText: 'No Content' });

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('sends refresh token in logout body', () => {
    localStorage.setItem('matrix.accessToken', 'access123');
    localStorage.setItem('matrix.refreshToken', 'refresh123');

    service.logout().subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/logout/`);
    expect(req.request.body).toEqual({ refresh: 'refresh123' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('clears tokens even when logout fails', () => {
    localStorage.setItem('matrix.accessToken', 'access123');
    localStorage.setItem('matrix.refreshToken', 'refresh123');

    service.logout().subscribe({ error: () => {} });
    http.expectOne(`${environment.apiUrl}/auth/logout/`).error(new ProgressEvent('network'));

    expect(service.getToken()).toBeNull();
    expect(service.getRefreshToken()).toBeNull();
  });
});
