import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { EmployeesComponent } from './employees.component';

describe('EmployeesComponent', () => {
  let fixture: ComponentFixture<EmployeesComponent>;
  let component: EmployeesComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [EmployeesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('loads employees on init and stores them in the signal', () => {
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/employees/`);
    req.flush([
      { id: 1, first_name: 'Ada', last_name: 'Lovelace', full_name: 'Ada Lovelace', email: 'a@x.com', user: null },
    ]);

    expect(component.data().length).toBe(1);
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('sets an error message when loading fails', () => {
    fixture.detectChanges();

    const req = http.expectOne(`${environment.apiUrl}/employees/`);
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.error()).toBe('Failed to load employees.');
    expect(component.loading()).toBeFalse();
  });

  it('logs out and navigates to /login', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/employees/`).flush([]);

    const navigateSpy = spyOn(router, 'navigate');
    component.logout();

    http.expectOne(`${environment.apiUrl}/auth/logout/`).flush(null, { status: 204, statusText: 'No Content' });

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
