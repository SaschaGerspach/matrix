import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PaginatedResponse } from './pagination';

export interface SkillProposal {
  id: number;
  proposed_by: number;
  proposed_by_name: string;
  skill_name: string;
  category: number | null;
  category_name: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  review_note: string;
  created_at: string;
  reviewed_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class SkillProposalService {
  private readonly http = inject(HttpClient);

  list(status?: string): Observable<PaginatedResponse<SkillProposal>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<SkillProposal>>(
      `${environment.apiUrl}/skill-proposals/`, { params },
    );
  }

  create(data: {
    proposed_by: number; skill_name: string;
    category?: number; reason?: string;
  }): Observable<SkillProposal> {
    return this.http.post<SkillProposal>(
      `${environment.apiUrl}/skill-proposals/`, data,
    );
  }

  approve(id: number, reviewNote = ''): Observable<SkillProposal> {
    return this.http.post<SkillProposal>(
      `${environment.apiUrl}/skill-proposals/${id}/approve/`, { review_note: reviewNote },
    );
  }

  reject(id: number, reviewNote = ''): Observable<SkillProposal> {
    return this.http.post<SkillProposal>(
      `${environment.apiUrl}/skill-proposals/${id}/reject/`, { review_note: reviewNote },
    );
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/skill-proposals/${id}/`);
  }
}
