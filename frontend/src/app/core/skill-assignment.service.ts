import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MatrixAssignment, MySkillAssignment, TeamAssignment } from './skill.models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SkillAssignmentService {
  private readonly http = inject(HttpClient);

  mySkills(): Observable<MySkillAssignment[]> {
    return this.http.get<MySkillAssignment[]>(`${environment.apiUrl}/my-skills/`);
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
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<TeamAssignment[]>(`${environment.apiUrl}/team-assignments/`, { params });
  }

  confirmAssignment(id: number): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/skill-assignments/${id}/confirm/`, {});
  }
}
