import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../core/auth.service';
import { LanguageService } from '../core/language.service';
import { MeService } from '../core/me.service';
import { NotificationItem, NotificationService } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    DatePipe, MatBadgeModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatToolbarModule, RouterLink, RouterLinkActive, RouterOutlet, TranslateModule,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly meService = inject(MeService);
  readonly langService = inject(LanguageService);
  readonly notificationService = inject(NotificationService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly isTeamLead = signal(false);
  readonly isAdmin = signal(false);
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = this.notificationService.unreadCount;

  pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.langService.init();
    this.meService.getProfile().subscribe({
      next: (profile) => {
        this.isTeamLead.set(profile.is_team_lead);
        this.isAdmin.set(profile.is_admin);
      },
    });
    this.notificationService.loadUnreadCount();

    this.notificationService.connectWebSocket();

    this.pollTimer = setInterval(() => this.notificationService.loadUnreadCount(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.notificationService.disconnectWebSocket();
  }

  loadNotifications(): void {
    this.notificationService.list().subscribe({
      next: (r) => this.notifications.set(r.results),
    });
  }

  markAsRead(n: NotificationItem): void {
    if (!n.is_read) {
      this.notificationService.markAsRead(n.id).subscribe();
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => ({ ...n, is_read: true })),
        );
      },
    });
  }

  logout(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.notificationService.disconnectWebSocket();
    this.meService.clearCache();
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
