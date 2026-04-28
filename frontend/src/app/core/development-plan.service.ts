import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PaginatedResponse } from './pagination';

export interface DevelopmentGoal {
  id: number;
  plan: number;
  skill: number;
  skill_name: string;
  category_name: string;
  current_level: number;
  target_level: number;
  target_date: string | null;
  status: 'open' | 'in_progress' | 'completed';
}

export interface DevelopmentPlan {
  id: number;
  employee: number;
  employee_name: string;
  title: string;
  notes: string;
  goals: DevelopmentGoal[];
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class DevelopmentPlanService {
  private readonly http = inject(HttpClient);

  listPlans(employeeId?: number): Observable<PaginatedResponse<DevelopmentPlan>> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employee', employeeId);
    return this.http.get<PaginatedResponse<DevelopmentPlan>>(
      `${environment.apiUrl}/development-plans/`, { params },
    );
  }

  getPlan(id: number): Observable<DevelopmentPlan> {
    return this.http.get<DevelopmentPlan>(`${environment.apiUrl}/development-plans/${id}/`);
  }

  createPlan(employee: number, title: string, notes = ''): Observable<DevelopmentPlan> {
    return this.http.post<DevelopmentPlan>(
      `${environment.apiUrl}/development-plans/`, { employee, title, notes },
    );
  }

  updatePlan(id: number, data: Partial<DevelopmentPlan>): Observable<DevelopmentPlan> {
    return this.http.patch<DevelopmentPlan>(
      `${environment.apiUrl}/development-plans/${id}/`, data,
    );
  }

  deletePlan(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/development-plans/${id}/`);
  }

  createGoal(data: {
    plan: number; skill: number; current_level: number;
    target_level: number; target_date?: string;
  }): Observable<DevelopmentGoal> {
    return this.http.post<DevelopmentGoal>(
      `${environment.apiUrl}/development-goals/`, data,
    );
  }

  updateGoal(id: number, data: Partial<DevelopmentGoal>): Observable<DevelopmentGoal> {
    return this.http.patch<DevelopmentGoal>(
      `${environment.apiUrl}/development-goals/${id}/`, data,
    );
  }

  deleteGoal(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/development-goals/${id}/`);
  }
}
