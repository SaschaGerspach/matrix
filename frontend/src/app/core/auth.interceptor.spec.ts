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

  it('sets withCredentials on requests', () => {
    http.get('/test').subscribe();
    const req = controller.expectOne('/test');
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
  });

  it('does not add Authorization header', () => {
    http.get('/test').subscribe();
    const req = controller.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('refreshes and retries on 401', () => {
    localStorage.setItem('matrix.loggedIn', '1');

    http.get('/api/test').subscribe();

    const original = controller.expectOne('/api/test');
    original.flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = controller.expectOne(`${environment.apiUrl}/auth/refresh/`);
    expect(refresh.request.withCredentials).toBeTrue();
    refresh.flush({ detail: 'ok' });

    const retry = controller.expectOne('/api/test');
    expect(retry.request.withCredentials).toBeTrue();
    retry.flush({ data: 'ok' });
  });

  it('redirects to login when refresh also fails', () => {
    localStorage.setItem('matrix.loggedIn', '1');

    http.get('/api/test').subscribe({ error: () => {} });

    controller.expectOne('/api/test').flush({}, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne(`${environment.apiUrl}/auth/refresh/`).flush(
      {}, { status: 401, statusText: 'Unauthorized' },
    );

    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(localStorage.getItem('matrix.loggedIn')).toBeNull();
  });

  it('does not intercept auth endpoints', () => {
    http.post(`${environment.apiUrl}/auth/login/`, {}).subscribe({ error: () => {} });
    const req = controller.expectOne(`${environment.apiUrl}/auth/login/`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not redirect on non-401 errors', () => {
    http.get('/api/test').subscribe({ error: () => {} });
    const req = controller.expectOne('/api/test');
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
