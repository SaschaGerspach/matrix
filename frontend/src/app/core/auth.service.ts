import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

const LOGGED_IN_KEY = 'matrix.loggedIn';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly _loggedIn = signal(localStorage.getItem(LOGGED_IN_KEY) === '1');

  login(username: string, password: string): Observable<unknown> {
    return this.http
      .post(`${environment.apiUrl}/auth/login/`, { username, password }, { withCredentials: true })
      .pipe(tap(() => this.setLoggedIn(true)));
  }

  refresh(): Observable<unknown> {
    return this.http
      .post(`${environment.apiUrl}/auth/refresh/`, {}, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/logout/`, {}, { withCredentials: true }).pipe(
      tap({
        next: () => this.setLoggedIn(false),
        error: () => this.setLoggedIn(false),
      }),
    );
  }

  isLoggedIn(): boolean {
    return this._loggedIn();
  }

  clearSession(): void {
    this.setLoggedIn(false);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password/`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  private setLoggedIn(value: boolean): void {
    this._loggedIn.set(value);
    if (value) {
      localStorage.setItem(LOGGED_IN_KEY, '1');
    } else {
      localStorage.removeItem(LOGGED_IN_KEY);
    }
  }
}
