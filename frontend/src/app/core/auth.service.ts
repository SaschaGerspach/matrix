import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

const ACCESS_KEY = 'matrix.accessToken';
const REFRESH_KEY = 'matrix.refreshToken';

interface TokenResponse {
  access: string;
  refresh: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/login/`, { username, password })
      .pipe(tap((r) => this.storeTokens(r.access, r.refresh)));
  }

  refresh(): Observable<TokenResponse> {
    const token = this.getRefreshToken();
    return this.http
      .post<TokenResponse>(`${environment.apiUrl}/auth/refresh/`, { refresh: token })
      .pipe(tap((r) => this.storeTokens(r.access, r.refresh)));
  }

  logout(): Observable<void> {
    const refresh = this.getRefreshToken();
    return this.http.post<void>(`${environment.apiUrl}/auth/logout/`, { refresh }).pipe(
      tap({
        next: () => this.clearTokens(),
        error: () => this.clearTokens(),
      }),
    );
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }

  isLoggedIn(): boolean {
    return this.getRefreshToken() !== null;
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password/`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  private storeTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  }
}
