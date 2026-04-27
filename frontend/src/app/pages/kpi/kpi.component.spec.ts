import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { KpiComponent, TeamKpi } from './kpi.component';

const kpiData: TeamKpi[] = [
  {
    team_id: 1,
    team_name: 'Alpha',
    member_count: 3,
    avg_level: 3.5,
    coverage: 80,
    total_assignments: 6,
    confirmed_ratio: 66.7,
  },
  {
    team_id: 2,
    team_name: 'Beta',
    member_count: 2,
    avg_level: 2.0,
    coverage: 50,
    total_assignments: 2,
    confirmed_ratio: 100,
  },
];

describe('KpiComponent', () => {
  let fixture: ComponentFixture<KpiComponent>;
  let component: KpiComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KpiComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideCharts(withDefaultRegisterables()),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(KpiComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads KPI data on init', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).flush(kpiData);

    expect(component.data().length).toBe(2);
    expect(component.data()[0].team_name).toBe('Alpha');
    expect(component.loading()).toBeFalse();
  });

  it('shows empty state when no teams', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).flush([]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No team data available');
  });

  it('renders KPI cards', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).flush(kpiData);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alpha');
    expect(el.textContent).toContain('3 members');
    expect(el.textContent).toContain('80%');
    expect(el.textContent).toContain('Beta');
  });

  it('shows spinner while loading', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('mat-progress-spinner')).toBeTruthy();

    http.expectOne(`${environment.apiUrl}/kpi/`).flush(kpiData);
    fixture.detectChanges();

    expect(el.querySelector('mat-progress-spinner')).toBeFalsy();
  });

  it('handles error gracefully', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).error(new ProgressEvent('error'));

    expect(component.loading()).toBeFalse();
    expect(component.data().length).toBe(0);
  });

  it('builds bar chart config from data', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).flush(kpiData);

    const config = component.barChartConfig();
    expect(config.data.labels).toEqual(['Alpha', 'Beta']);
    expect(config.data.datasets.length).toBe(2);
    expect(config.data.datasets[0].data).toEqual([3.5, 2.0]);
    expect(config.data.datasets[1].data).toEqual([80, 50]);
  });
});
