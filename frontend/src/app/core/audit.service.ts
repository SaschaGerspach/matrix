import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PaginatedResponse } from './pagination';

export interface AuditLogEntry {
  id: number;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  detail: string;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);

  list(): Observable<PaginatedResponse<AuditLogEntry>> {
    return this.http.get<PaginatedResponse<AuditLogEntry>>(`${environment.apiUrl}/audit-log/`);
  }
}
