import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class SkillService {
  private readonly http = inject(HttpClient);

  mySkills(): Observable<MySkillAssignment[]> {
    return this.http.get<MySkillAssignment[]>(`${environment.apiUrl}/my-skills/`);
  }

  listSkills(): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${environment.apiUrl}/skills/`);
  }

  listCategories(): Observable<SkillCategory[]> {
    return this.http.get<SkillCategory[]>(`${environment.apiUrl}/skill-categories/`);
  }

  createAssignment(skillId: number, level: number, employeeId: number): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/skill-assignments/`, {
      skill: skillId,
      level,
      employee: employeeId,
    });
  }
}
