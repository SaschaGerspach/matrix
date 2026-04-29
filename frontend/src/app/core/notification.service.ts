import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, OnDestroy } from '@angular/core';
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
export class NotificationService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/notifications/`;

  readonly unreadCount = signal(0);
  readonly latestNotification = signal<NotificationItem | null>(null);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 20;

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

  connectWebSocket(): void {
    this.connected = true;
    this.reconnectAttempts = 0;
    this.createSocket();
  }

  disconnectWebSocket(): void {
    this.connected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
  }

  private createSocket(): void {
    if (!this.connected) return;

    const wsUrl = `${environment.wsUrl}/notifications/`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onmessage = (event) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      this.latestNotification.set(data as unknown as NotificationItem);
      this.unreadCount.update((c) => c + 1);
    };

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.socket.onclose = () => {
      if (this.connected && this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 60000);
        this.reconnectAttempts++;
        this.reconnectTimer = setTimeout(() => this.createSocket(), delay);
      }
    };
  }
}
