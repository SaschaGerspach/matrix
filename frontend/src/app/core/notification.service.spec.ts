import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads unread count', () => {
    service.loadUnreadCount();
    http.expectOne(`${environment.apiUrl}/notifications/unread_count/`).flush({ count: 5 });
    expect(service.unreadCount()).toBe(5);
  });

  it('lists notifications', () => {
    service.list().subscribe((r) => {
      expect(r.count).toBe(1);
    });
    http.expectOne(`${environment.apiUrl}/notifications/`).flush({
      count: 1, next: null, previous: null,
      results: [{ id: 1, type: 'skill_confirmed', message: 'test', is_read: false, actor: null, actor_name: null, created_at: '' }],
    });
  });

  it('marks as read and refreshes count', () => {
    service.unreadCount.set(3);
    service.markAsRead(1).subscribe();
    http.expectOne(`${environment.apiUrl}/notifications/1/read/`).flush({
      id: 1, type: 'skill_confirmed', message: 'test', is_read: true, actor: null, actor_name: null, created_at: '',
    });
    http.expectOne(`${environment.apiUrl}/notifications/unread_count/`).flush({ count: 2 });
    expect(service.unreadCount()).toBe(2);
  });

  it('marks all as read', () => {
    service.unreadCount.set(5);
    service.markAllAsRead().subscribe();
    http.expectOne(`${environment.apiUrl}/notifications/read_all/`).flush({ status: 'ok' });
    expect(service.unreadCount()).toBe(0);
  });
});
