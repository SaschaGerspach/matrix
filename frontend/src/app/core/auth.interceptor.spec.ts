import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

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
});
