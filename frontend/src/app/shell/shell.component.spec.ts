import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../environments/environment';
import { ShellComponent } from './shell.component';

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
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('renders navigation links', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('My Skills');
    expect(el.textContent).toContain('Employees');
  });

  it('logs out and navigates to login', () => {
    const navigateSpy = spyOn(router, 'navigate');
    component.logout();
    http.expectOne(`${environment.apiUrl}/auth/logout/`).flush(null, { status: 204, statusText: 'No Content' });
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
