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

export interface EmployeeProfileSkill {
  id: number;
  skill_id: number;
  skill_name: string;
  category_name: string;
  level: number;
  status: string;
}

export interface CsvImportResult {
  created: number;
  skipped: number;
  errors: { row: number; detail: string }[];
}

export interface EmployeeProfile {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  teams: { id: number; name: string }[];
  skills: EmployeeProfileSkill[];
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);

  list(page = 1): Observable<PaginatedResponse<Employee>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<PaginatedResponse<Employee>>(`${environment.apiUrl}/employees/`, { params });
  }

  getProfile(id: number): Observable<EmployeeProfile> {
    return this.http.get<EmployeeProfile>(`${environment.apiUrl}/employees/${id}/profile/`);
  }

  importCsv(file: File): Observable<CsvImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CsvImportResult>(`${environment.apiUrl}/employees/import-csv/`, formData);
  }
}
