import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { PaginatedResponse } from './pagination';
import { environment } from '../../environments/environment';

export interface NotificationItem {
  id: number;
  type: string;
  message: string;
  is_read: boolean;
  actor: number | null;
  actor_name: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notifications/`;

  readonly unreadCount = signal(0);

  list(): Observable<PaginatedResponse<NotificationItem>> {
    return this.http.get<PaginatedResponse<NotificationItem>>(this.url);
  }

  loadUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.url}unread_count/`).subscribe({
      next: (r) => this.unreadCount.set(r.count),
    });
  }

  markAsRead(id: number): Observable<NotificationItem> {
    return this.http.post<NotificationItem>(`${this.url}${id}/read/`, {}).pipe(
      tap(() => this.loadUnreadCount()),
    );
  }

  markAllAsRead(): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.url}read_all/`, {}).pipe(
      tap(() => this.unreadCount.set(0)),
    );
  }
}
