import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PaginatedResponse } from './pagination';
import {
  KpiEntry,
  LevelDistribution,
  SkillGap,
  SkillHistoryEntry,
  SkillMatrixData,
  SkillRecommendation,
  SkillTrendData,
  TeamComparisonEntry,
} from './skill.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SkillAnalyticsService {
  private readonly http = inject(HttpClient);

  skillMatrix(filters?: { team?: number; category?: number; search?: string }): Observable<SkillMatrixData> {
    let params = new HttpParams();
    if (filters?.team) params = params.set('team', filters.team);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<SkillMatrixData>(`${environment.apiUrl}/skill-matrix/`, { params });
  }

  skillGaps(): Observable<SkillGap[]> {
    return this.http.get<SkillGap[]>(`${environment.apiUrl}/skill-gaps/`);
  }

  skillTrends(employeeId: number): Observable<SkillTrendData[]> {
    const params = new HttpParams().set('employee', employeeId);
    return this.http.get<SkillTrendData[]>(
      `${environment.apiUrl}/skill-trends/`, { params },
    );
  }

  teamComparison(teamIds: number[]): Observable<TeamComparisonEntry[]> {
    let params = new HttpParams();
    for (const id of teamIds) {
      params = params.append('teams', id);
    }
    return this.http.get<TeamComparisonEntry[]>(
      `${environment.apiUrl}/team-comparison/`, { params },
    );
  }

  recommendations(): Observable<SkillRecommendation[]> {
    return this.http.get<SkillRecommendation[]>(`${environment.apiUrl}/skill-recommendations/`);
  }

  skillHistory(employeeId?: number): Observable<PaginatedResponse<SkillHistoryEntry>> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employee', employeeId);
    return this.http.get<PaginatedResponse<SkillHistoryEntry>>(
      `${environment.apiUrl}/skill-history/`, { params },
    );
  }

  kpiData(): Observable<KpiEntry[]> {
    return this.http.get<KpiEntry[]>(`${environment.apiUrl}/kpi/`);
  }

  levelDistribution(): Observable<LevelDistribution> {
    return this.http.get<LevelDistribution>(`${environment.apiUrl}/kpi/level-distribution/`);
  }

  exportMatrixCsv(): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/skill-matrix/export/`, { responseType: 'blob' });
  }

  exportMatrixPdf(): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/skill-matrix/export-pdf/`, { responseType: 'blob' });
  }
}
