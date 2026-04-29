import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CsvImportResult } from './employee.service';
import { Skill, SkillCategory, SkillLevelDescription, SkillRequirement } from './skill.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SkillCatalogService {
  private readonly http = inject(HttpClient);

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

  listLevelDescriptions(): Observable<SkillLevelDescription[]> {
    return this.http.get<SkillLevelDescription[]>(`${environment.apiUrl}/skill-level-descriptions/`);
  }

  createLevelDescription(skill: number, level: number, description: string): Observable<SkillLevelDescription> {
    return this.http.post<SkillLevelDescription>(`${environment.apiUrl}/skill-level-descriptions/`, {
      skill, level, description,
    });
  }

  deleteLevelDescription(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/skill-level-descriptions/${id}/`);
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

  importSkillsCsv(file: File): Observable<CsvImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CsvImportResult>(`${environment.apiUrl}/skills/import-csv/`, formData);
  }
}
