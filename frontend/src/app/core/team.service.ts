import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface TeamPerson {
  id: number;
  full_name: string;
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

  setLeads(teamId: number, leadIds: number[]): Observable<Team> {
    return this.http.patch<Team>(
      `${environment.apiUrl}/teams/${teamId}/`, { team_leads: leadIds },
    );
  }

  setMembers(teamId: number, memberIds: number[]): Observable<Team> {
    return this.http.patch<Team>(
      `${environment.apiUrl}/teams/${teamId}/`, { members: memberIds },
    );
  }
}
