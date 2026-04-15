import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { Employee, EmployeeService } from './employee.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EmployeeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches the employee list from the API', () => {
    const payload: Employee[] = [
      { id: 1, first_name: 'Ada', last_name: 'Lovelace', full_name: 'Ada Lovelace', email: 'a@x.com', user: null },
    ];
    let received: Employee[] | undefined;
    service.list().subscribe((result) => (received = result));

    const req = http.expectOne(`${environment.apiUrl}/employees/`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);

    expect(received).toEqual(payload);
  });
});
