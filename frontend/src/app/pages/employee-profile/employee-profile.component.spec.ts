import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import {
  Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler,
  LineController, CategoryScale, LinearScale,
} from 'chart.js';

import { environment } from '../../../environments/environment';
import { EmployeeProfileComponent } from './employee-profile.component';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, LineController, CategoryScale, LinearScale);

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

const historyResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      id: 1, employee: 1, employee_name: 'Alice A', skill: 1, skill_name: 'Python',
      old_level: null, new_level: 4, action: 'created',
      changed_by: 1, changed_by_name: 'Alice A', timestamp: '2026-04-27T10:00:00Z',
    },
  ],
};

const trendsResponse = [
  {
    skill_name: 'Python',
    points: [
      { date: '2026-04-20T10:00:00Z', level: 2 },
      { date: '2026-04-25T10:00:00Z', level: 4 },
    ],
  },
];

function flushInitRequests(
  http: HttpTestingController,
  profile = profileResponse,
  history = historyResponse,
  trends = trendsResponse,
): void {
  http.expectOne(`${environment.apiUrl}/employees/1/profile/`).flush(profile);
  http.expectOne((r) => r.url === `${environment.apiUrl}/skill-history/`).flush(history);
  http.expectOne((r) => r.url === `${environment.apiUrl}/skill-trends/`).flush(trends);
}

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
    flushInitRequests(http);
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
    flushInitRequests(http);

    expect(component.radarData.labels).toEqual(['Python', 'Docker']);
    expect(component.radarData.datasets[0].data).toEqual([4, 2]);
  });

  it('shows skills table', () => {
    fixture.detectChanges();
    flushInitRequests(http);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Python');
    expect(el.textContent).toContain('Docker');
    expect(el.textContent).toContain('Programming');
  });

  it('shows empty state when no skills', () => {
    fixture.detectChanges();
    flushInitRequests(http, { ...profileResponse, skills: [] });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No skills assigned');
  });

  it('displays history entries', () => {
    fixture.detectChanges();
    flushInitRequests(http);
    fixture.detectChanges();

    expect(component.history().length).toBe(1);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('History');
    expect(el.textContent).toContain('created');
  });

  it('hides history when empty', () => {
    fixture.detectChanges();
    flushInitRequests(http, profileResponse, { count: 0, next: null, previous: null, results: [] });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('History');
  });

  it('shows trend chart when data available', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    expect(component.hasTrends()).toBeTrue();
    expect(component.trendData.datasets.length).toBe(1);
    expect(component.trendData.datasets[0].label).toBe('Python');
  });

  it('hides trend chart when no data', () => {
    fixture.detectChanges();
    flushInitRequests(http, profileResponse, historyResponse, []);

    expect(component.hasTrends()).toBeFalse();
  });

  it('handles error gracefully', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/employees/1/profile/`).flush(null, {
      status: 404, statusText: 'Not Found',
    });
    http.expectOne((r) => r.url === `${environment.apiUrl}/skill-history/`).flush(
      { count: 0, next: null, previous: null, results: [] },
    );
    http.expectOne((r) => r.url === `${environment.apiUrl}/skill-trends/`).flush([]);
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    expect(component.profile()).toBeNull();
  });
});
