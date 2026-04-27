import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';

import { environment } from '../../../environments/environment';
import { EmployeeProfileComponent } from './employee-profile.component';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler);

const profileResponse = {
  id: 1,
  first_name: 'Alice',
  last_name: 'A',
  full_name: 'Alice A',
  email: 'alice@x.com',
  teams: [{ id: 1, name: 'Core' }],
  skills: [
    { id: 10, skill_id: 1, skill_name: 'Python', category_name: 'Programming', level: 4, status: 'confirmed' },
    { id: 11, skill_id: 2, skill_name: 'Docker', category_name: 'Ops', level: 2, status: 'pending' },
  ],
};

describe('EmployeeProfileComponent', () => {
  let fixture: ComponentFixture<EmployeeProfileComponent>;
  let component: EmployeeProfileComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeProfileComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and displays employee profile', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/employees/1/profile/`).flush(profileResponse);
    fixture.detectChanges();

    expect(component.profile()?.full_name).toBe('Alice A');
    expect(component.loading()).toBeFalse();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alice A');
    expect(el.textContent).toContain('alice@x.com');
    expect(el.textContent).toContain('Core');
  });

  it('builds radar data from skills', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/employees/1/profile/`).flush(profileResponse);

    expect(component.radarData.labels).toEqual(['Python', 'Docker']);
    expect(component.radarData.datasets[0].data).toEqual([4, 2]);
  });

  it('shows skills table', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/employees/1/profile/`).flush(profileResponse);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Python');
    expect(el.textContent).toContain('Docker');
    expect(el.textContent).toContain('Programming');
  });

  it('shows empty state when no skills', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/employees/1/profile/`).flush({
      ...profileResponse, skills: [],
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No skills assigned');
  });

  it('handles error gracefully', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/employees/1/profile/`).flush(null, {
      status: 404, statusText: 'Not Found',
    });
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    expect(component.profile()).toBeNull();
  });
});
