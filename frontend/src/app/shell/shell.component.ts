import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../core/auth.service';
import { LanguageService } from '../core/language.service';
import { LocalDatePipe } from '../core/local-date.pipe';
import { MeProfile, MeService } from '../core/me.service';
import { NotificationItem, NotificationService } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    LocalDatePipe, MatBadgeModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatSidenavModule, RouterLink, RouterLinkActive, RouterOutlet, TranslateModule,
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
  private readonly translate = inject(TranslateService);

  readonly me = signal<MeProfile | null>(null);
  readonly isTeamLead = signal(false);
  readonly isAdmin = signal(false);
  readonly initials = computed(() => {
    const profile = this.me();
    return profile ? `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase() : '';
  });
  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = this.notificationService.unreadCount;
  readonly isCompact = signal(false);
  readonly navOpen = signal(true);

  pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(BreakpointObserver)
      .observe('(max-width: 959px)')
      .pipe(takeUntilDestroyed())
      .subscribe(({ matches }) => {
        this.isCompact.set(matches);
        this.navOpen.set(!matches);
      });
  }

  onNavigate(): void {
    if (this.isCompact()) {
      this.navOpen.set(false);
    }
  }

  ngOnInit(): void {
    this.langService.init();
    this.meService.getProfile().subscribe({
      next: (profile) => {
        this.me.set(profile);
        this.isTeamLead.set(profile.is_team_lead);
        this.isAdmin.set(profile.is_admin);
      },
    });
    this.notificationService.loadUnreadCount();

    this.notificationService.connectWebSocket();

    // Polling fallback in case the WebSocket silently drops.
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

  // Composed here so the text follows the UI language. Notifications stored
  // before params existed, or of a type without a translation, keep the
  // English text the backend wrote.
  notificationText(n: NotificationItem): string {
    if (!n.params || Object.keys(n.params).length === 0) return n.message;
    const key = `NOTIFICATIONS.MESSAGE_${n.type.toUpperCase()}`;
    const actor = n.actor_name ?? this.translate.instant('NOTIFICATIONS.SOMEONE');
    const text: string = this.translate.instant(key, { ...n.params, actor });
    return text === key ? n.message : text;
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
