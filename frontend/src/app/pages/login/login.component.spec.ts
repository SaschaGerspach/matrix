import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('does not submit when the form is invalid', () => {
    component.submit();
    expect(component.loading()).toBeFalse();
    http.expectNone(`${environment.apiUrl}/auth/login/`);
  });

  it('navigates to /my-skills on successful login', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.form.setValue({ username: 'user', password: 'pw' });
    component.submit();

    const req = http.expectOne(`${environment.apiUrl}/auth/login/`);
    req.flush({ detail: 'ok' });

    expect(navigateSpy).toHaveBeenCalledWith(['/my-skills']);
    expect(component.loading()).toBeFalse();
    expect(component.errorMessage()).toBeNull();
  });

  it('shows an error message on failed login', () => {
    component.form.setValue({ username: 'user', password: 'wrong' });
    component.submit();

    const req = http.expectOne(`${environment.apiUrl}/auth/login/`);
    req.flush(
      { non_field_errors: ['Invalid credentials.'] },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component.loading()).toBeFalse();
    expect(component.errorMessage()).toBe('LOGIN.INVALID_CREDENTIALS');
  });
});
