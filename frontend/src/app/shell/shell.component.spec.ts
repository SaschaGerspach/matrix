import { ComponentFixture, TestBed } from '@angular/core/testing';
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
    http.expectOne(`${environment.apiUrl}/me/`).flush(meProfile);
  });

  afterEach(() => {
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
});
