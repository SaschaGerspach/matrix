import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

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

  list(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${environment.apiUrl}/employees/`);
  }
}
