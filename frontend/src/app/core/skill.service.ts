import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PaginatedResponse } from './pagination';

import { environment } from '../../environments/environment';

export interface MySkillAssignment {
  id: number;
  skill: number;
  skill_name: string;
  category_name: string;
  level: number;
  status: string;
  confirmed_at: string | null;
  created_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: number;
}

export interface SkillCategory {
  id: number;
  name: string;
  parent: number | null;
}

export interface MatrixEmployee {
  id: number;
  full_name: string;
}

export interface MatrixSkill {
  id: number;
  name: string;
  category_name: string;
}

export interface MatrixAssignment {
  id: number;
  employee: number;
  skill: number;
  level: number;
  status: string;
}

export interface SkillMatrixData {
  employees: MatrixEmployee[];
  skills: MatrixSkill[];
  assignments: MatrixAssignment[];
}

export interface SkillGap {
  employee_id: number;
  employee_name: string;
  team_name: string;
  skill_id: number;
  skill_name: string;
  category_name: string;
  required_level: number;
  actual_level: number;
  gap: number;
}

export interface SkillRequirement {
  id: number;
  team: number;
  team_name: string;
  skill: number;
  skill_name: string;
  category_name: string;
  required_level: number;
}

export interface TeamAssignment {
  id: number;
  employee: number;
  employee_name: string;
  skill: number;
  skill_name: string;
  category_name: string;
  level: number;
  status: string;
  created_at: string;
}

export interface SkillHistoryEntry {
  id: number;
  employee: number;
  employee_name: string;
  skill: number;
  skill_name: string;
  old_level: number | null;
  new_level: number | null;
  action: string;
  changed_by: number | null;
  changed_by_name: string | null;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class SkillService {
  private readonly http = inject(HttpClient);

  mySkills(): Observable<MySkillAssignment[]> {
    return this.http.get<MySkillAssignment[]>(`${environment.apiUrl}/my-skills/`);
  }

  listSkills(): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${environment.apiUrl}/skills/`);
  }

  createSkill(name: string, category: number): Observable<Skill> {
    return this.http.post<Skill>(`${environment.apiUrl}/skills/`, { name, category });
  }

  deleteSkill(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/skills/${id}/`);
  }

  listCategories(): Observable<SkillCategory[]> {
    return this.http.get<SkillCategory[]>(`${environment.apiUrl}/skill-categories/`);
  }

  createCategory(name: string): Observable<SkillCategory> {
    return this.http.post<SkillCategory>(`${environment.apiUrl}/skill-categories/`, { name });
  }

  deleteCategory(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/skill-categories/${id}/`);
  }

  createAssignment(skillId: number, level: number, employeeId: number): Observable<MatrixAssignment> {
    return this.http.post<MatrixAssignment>(`${environment.apiUrl}/skill-assignments/`, {
      skill: skillId,
      level,
      employee: employeeId,
    });
  }

  updateAssignment(id: number, level: number): Observable<MatrixAssignment> {
    return this.http.patch<MatrixAssignment>(`${environment.apiUrl}/skill-assignments/${id}/`, { level });
  }

  deleteAssignment(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/skill-assignments/${id}/`);
  }

  teamAssignments(status?: string): Observable<TeamAssignment[]> {
    const params = status ? `?status=${status}` : '';
    return this.http.get<TeamAssignment[]>(`${environment.apiUrl}/team-assignments/${params}`);
  }

  confirmAssignment(id: number): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/skill-assignments/${id}/confirm/`, {});
  }

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

  listRequirements(): Observable<SkillRequirement[]> {
    return this.http.get<SkillRequirement[]>(`${environment.apiUrl}/skill-requirements/`);
  }

  createRequirement(team: number, skill: number, requiredLevel: number): Observable<SkillRequirement> {
    return this.http.post<SkillRequirement>(`${environment.apiUrl}/skill-requirements/`, {
      team, skill, required_level: requiredLevel,
    });
  }

  deleteRequirement(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/skill-requirements/${id}/`);
  }

  skillHistory(employeeId?: number): Observable<PaginatedResponse<SkillHistoryEntry>> {
    let params = new HttpParams();
    if (employeeId) params = params.set('employee', employeeId);
    return this.http.get<PaginatedResponse<SkillHistoryEntry>>(
      `${environment.apiUrl}/skill-history/`, { params },
    );
  }
}
