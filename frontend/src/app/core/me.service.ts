import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

import { environment } from '../../environments/environment';

export interface MeProfile {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  user: number | null;
  is_team_lead: boolean;
  is_admin: boolean;
}

@Injectable({ providedIn: 'root' })
export class MeService {
  private readonly http = inject(HttpClient);
  // Manual cache so logout can invalidate via clearCache();
  // shareReplay alone would cache forever.
  private profile$: Observable<MeProfile> | null = null;

  getProfile(): Observable<MeProfile> {
    if (!this.profile$) {
      this.profile$ = this.http
        .get<MeProfile>(`${environment.apiUrl}/me/`)
        .pipe(shareReplay(1));
    }
    return this.profile$;
  }

  clearCache(): void {
    this.profile$ = null;
  }
}
