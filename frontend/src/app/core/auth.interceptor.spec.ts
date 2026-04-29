import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { environment } from '../../environments/environment';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');
  });

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('does not add an Authorization header when no token is stored', () => {
    http.get('/test').subscribe();
    const req = controller.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('adds the Bearer Authorization header when a token is stored', () => {
    localStorage.setItem('matrix.accessToken', 'access123');
    http.get('/test').subscribe();
    const req = controller.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer access123');
    req.flush({});
  });

  it('refreshes token and retries on 401', () => {
    localStorage.setItem('matrix.accessToken', 'expired');
    localStorage.setItem('matrix.refreshToken', 'valid-refresh');

    http.get('/api/test').subscribe();

    const original = controller.expectOne('/api/test');
    original.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = controller.expectOne(`${environment.apiUrl}/auth/refresh/`);
    expect(refresh.request.body).toEqual({ refresh: 'valid-refresh' });
    refresh.flush({ access: 'new-access', refresh: 'new-refresh' });

    const retry = controller.expectOne('/api/test');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ data: 'ok' });

    expect(localStorage.getItem('matrix.accessToken')).toBe('new-access');
    expect(localStorage.getItem('matrix.refreshToken')).toBe('new-refresh');
  });

  it('redirects to login when refresh also fails', () => {
    localStorage.setItem('matrix.accessToken', 'expired');
    localStorage.setItem('matrix.refreshToken', 'also-expired');

    http.get('/api/test').subscribe({ error: () => {} });

    controller.expectOne('/api/test').flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne(`${environment.apiUrl}/auth/refresh/`).flush(
      {}, { status: 401, statusText: 'Unauthorized' },
    );

    expect(localStorage.getItem('matrix.accessToken')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('does not intercept auth endpoints', () => {
    http.post(`${environment.apiUrl}/auth/login/`, {}).subscribe({ error: () => {} });
    const req = controller.expectOne(`${environment.apiUrl}/auth/login/`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not redirect on non-401 errors', () => {
    localStorage.setItem('matrix.accessToken', 'valid');
    http.get('/api/test').subscribe({ error: () => {} });
    const req = controller.expectOne('/api/test');
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(localStorage.getItem('matrix.accessToken')).toBe('valid');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
