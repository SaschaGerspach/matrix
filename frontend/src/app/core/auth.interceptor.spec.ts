import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

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

  it('adds the Authorization header when a token is stored', () => {
    localStorage.setItem('matrix.authToken', 'abc123');
    http.get('/test').subscribe();
    const req = controller.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Token abc123');
    req.flush({});
  });

  it('clears token and redirects on 401 response', () => {
    localStorage.setItem('matrix.authToken', 'expired-token');
    http.get('/api/test').subscribe({ error: () => {} });
    const req = controller.expectOne('/api/test');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('matrix.authToken')).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('does not redirect on 401 from login endpoint', () => {
    http.post('/api/auth/login/', {}).subscribe({ error: () => {} });
    const req = controller.expectOne('/api/auth/login/');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('does not redirect on non-401 errors', () => {
    localStorage.setItem('matrix.authToken', 'valid-token');
    http.get('/api/test').subscribe({ error: () => {} });
    const req = controller.expectOne('/api/test');
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(localStorage.getItem('matrix.authToken')).toBe('valid-token');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('propagates the error to subscribers after 401', () => {
    localStorage.setItem('matrix.authToken', 'token');
    let errorReceived = false;
    http.get('/api/test').subscribe({
      error: () => { errorReceived = true; },
    });
    const req = controller.expectOne('/api/test');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBeTrue();
  });
});
