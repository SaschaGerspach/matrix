import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface TeamPerson {
  id: number;
  full_name: string;
}

export interface Department {
  id: number;
  name: string;
  parent: number | null;
}

export interface Team {
  id: number;
  name: string;
  department: number;
  members: number[];
  team_leads: number[];
  member_details: TeamPerson[];
  lead_details: TeamPerson[];
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);

  list(): Observable<Team[]> {
    return this.http.get<Team[]>(`${environment.apiUrl}/teams/`);
  }

  listDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(`${environment.apiUrl}/departments/`);
  }

  create(name: string, department: number): Observable<Team> {
    return this.http.post<Team>(`${environment.apiUrl}/teams/`, { name, department });
  }

  createDepartment(name: string, parent: number | null): Observable<Department> {
    return this.http.post<Department>(`${environment.apiUrl}/departments/`, { name, parent });
  }

  setLeads(teamId: number, leadIds: number[]): Observable<Team> {
    return this.update(teamId, { team_leads: leadIds });
  }

  setMembers(teamId: number, memberIds: number[]): Observable<Team> {
    return this.update(teamId, { members: memberIds });
  }

  update(teamId: number, patch: { members?: number[]; team_leads?: number[] }): Observable<Team> {
    return this.http.patch<Team>(`${environment.apiUrl}/teams/${teamId}/`, patch);
  }
}
