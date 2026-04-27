import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { EmployeesComponent } from './employees.component';

describe('EmployeesComponent', () => {
  let fixture: ComponentFixture<EmployeesComponent>;
  let component: EmployeesComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeesComponent, TranslateTestingModule],
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
  });

  afterEach(() => {
    http.verify();
  });

  it('loads employees on init and stores them in the signal', () => {
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/employees/`);
    req.flush({
      count: 1,
      next: null,
      previous: null,
      results: [
        { id: 1, first_name: 'Ada', last_name: 'Lovelace', full_name: 'Ada Lovelace', email: 'a@x.com', user: null },
      ],
    });

    expect(component.data().length).toBe(1);
    expect(component.totalCount()).toBe(1);
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('sets an error message when loading fails', () => {
    fixture.detectChanges();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/employees/`);
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.error()).toBe('Failed to load employees.');
    expect(component.loading()).toBeFalse();
  });
});
