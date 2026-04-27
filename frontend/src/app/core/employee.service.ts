import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PaginatedResponse } from './pagination';

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  user: number | null;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  list(page = 1): Observable<PaginatedResponse<Employee>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<PaginatedResponse<Employee>>(`${environment.apiUrl}/employees/`, { params });
  }
}
