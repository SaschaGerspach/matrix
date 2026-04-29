import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { RoleTemplate } from './skill.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RoleTemplateService {
  private readonly http = inject(HttpClient);

  list(): Observable<RoleTemplate[]> {
    return this.http.get<RoleTemplate[]>(`${environment.apiUrl}/role-templates/`);
  }

  create(name: string, description: string): Observable<RoleTemplate> {
    return this.http.post<RoleTemplate>(`${environment.apiUrl}/role-templates/`, { name, description });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/role-templates/${id}/`);
  }

  addSkill(templateId: number, skill: number, requiredLevel: number): Observable<RoleTemplate> {
    return this.http.post<RoleTemplate>(`${environment.apiUrl}/role-templates/${templateId}/add-skill/`, {
      skill, required_level: requiredLevel,
    });
  }

  removeSkill(templateId: number, skillPk: number): Observable<RoleTemplate> {
    return this.http.delete<RoleTemplate>(`${environment.apiUrl}/role-templates/${templateId}/remove-skill/${skillPk}/`);
  }

  apply(templateId: number, teamId: number): Observable<{ created: number; updated: number }> {
    return this.http.post<{ created: number; updated: number }>(
      `${environment.apiUrl}/role-templates/${templateId}/apply/`, { team: teamId },
    );
  }
}
