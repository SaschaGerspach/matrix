import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PaginatedResponse } from './pagination';

export interface Certificate {
  id: number;
  employee: number;
  employee_name: string;
  skill: number | null;
  skill_name: string | null;
  name: string;
  issuer: string;
  issued_date: string | null;
  expiry_date: string | null;
  file: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CertificateService {
  private readonly http = inject(HttpClient);

  list(employeeId?: number): Observable<PaginatedResponse<Certificate>> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employee', employeeId);
    return this.http.get<PaginatedResponse<Certificate>>(
      `${environment.apiUrl}/certificates/`, { params },
    );
  }

  get(id: number): Observable<Certificate> {
    return this.http.get<Certificate>(`${environment.apiUrl}/certificates/${id}/`);
  }

  create(data: FormData): Observable<Certificate> {
    return this.http.post<Certificate>(`${environment.apiUrl}/certificates/`, data);
  }

  update(id: number, data: FormData | Partial<Certificate>): Observable<Certificate> {
    return this.http.patch<Certificate>(`${environment.apiUrl}/certificates/${id}/`, data);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/certificates/${id}/`);
  }
}
