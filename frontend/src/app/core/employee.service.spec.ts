import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../environments/environment';
import { EmployeeService } from './employee.service';
import { PaginatedResponse } from './pagination';
import { Employee } from './employee.service';

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

  it('fetches paginated employee list from the API', () => {
    const payload: PaginatedResponse<Employee> = {
      count: 1,
      next: null,
      previous: null,
      results: [
        { id: 1, first_name: 'Ada', last_name: 'Lovelace', full_name: 'Ada Lovelace', email: 'a@x.com', user: null },
      ],
    };
    let received: PaginatedResponse<Employee> | undefined;
    service.list().subscribe((result) => (received = result));

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/employees/`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(payload);

    expect(received!.results.length).toBe(1);
    expect(received!.count).toBe(1);
  });
});
