import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { MeProfile } from '../core/me.service';
import { ShellComponent } from './shell.component';

const meProfile: MeProfile = {
  id: 1, first_name: 'A', last_name: 'B', full_name: 'A B',
  email: 'a@b.com', user: 1, is_team_lead: false, is_admin: false,
};

function flushInit(http: HttpTestingController): void {
  http.expectOne(`${environment.apiUrl}/me/`).flush(meProfile);
  http.expectOne(`${environment.apiUrl}/notifications/unread_count/`).flush({ count: 0 });
}

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let component: ShellComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture.detectChanges();
    flushInit(http);
  });

  afterEach(() => {
    if (component.pollTimer) clearInterval(component.pollTimer);
    component.pollTimer = null;
    http.verify();
    localStorage.clear();
  });

  it('renders navigation links', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('My Skills');
    expect(el.textContent).toContain('Employees');
  });

  it('does not show Team Review for non-leads', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Team Review');
  });

  it('shows Team Review for team leads', () => {
    component.isTeamLead.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Team Review');
    expect(el.textContent).toContain('Team Comparison');
  });

  it('does not show Admin for non-admins', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Admin');
  });

  it('shows Admin for admins', () => {
    component.isAdmin.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Admin');
  });

  it('logs out and navigates to login', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.logout();
    http.expectOne(`${environment.apiUrl}/auth/logout/`).flush(null, { status: 204, statusText: 'No Content' });
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('renders notification bell', () => {
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-icon')).toBeTruthy();
    expect(el.textContent).toContain('notifications');
  });

  it('shows unread badge when count > 0', () => {
    component.notificationService.unreadCount.set(3);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.mat-badge-content');
    expect(badge?.textContent?.trim()).toBe('3');
  });

  it('loads notifications on menu open', () => {
    component.loadNotifications();
    const req = http.expectOne(`${environment.apiUrl}/notifications/`);
    req.flush({
      count: 1, next: null, previous: null,
      results: [{
        id: 1, type: 'skill_confirmed', message: 'Bob confirmed Python',
        is_read: false, actor: 2, actor_name: 'Bob', created_at: '2026-04-27T10:00:00Z',
      }],
    });
    expect(component.notifications().length).toBe(1);
  });

  it('marks all as read', () => {
    component.notificationService.unreadCount.set(2);
    component.notifications.set([
      { id: 1, type: 'skill_confirmed', message: 'test', is_read: false, actor: null, actor_name: null, created_at: '' },
    ]);
    component.markAllAsRead();
    http.expectOne(`${environment.apiUrl}/notifications/read_all/`).flush({ status: 'ok' });
    expect(component.unreadCount()).toBe(0);
    expect(component.notifications()[0].is_read).toBeTrue();
  });
});
