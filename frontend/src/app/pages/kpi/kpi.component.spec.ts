import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { KpiEntry } from '../../core/skill.models';
import { KpiComponent } from './kpi.component';

const kpiData: KpiEntry[] = [
  {
    team_id: 1,
    team_name: 'Alpha',
    member_count: 3,
    avg_level: 3.5,
    coverage: 80,
    total_assignments: 6,
    confirmed_ratio: 66.7,
    pending_count: 2,
    members: [{ id: 1, full_name: 'Alice A' }, { id: 2, full_name: 'Bob B' }],
    requirements: [
      { skill_id: 1, skill_name: 'Docker', required_level: 4, met_count: 0 },
      { skill_id: 2, skill_name: 'Python', required_level: 3, met_count: 3 },
    ],
  },
  {
    team_id: 2,
    team_name: 'Beta',
    member_count: 2,
    avg_level: 2.0,
    coverage: 50,
    total_assignments: 2,
    confirmed_ratio: 100,
    pending_count: 0,
    members: [],
    requirements: [],
  },
];

const distData = {
  overall: { '1': 1, '2': 3, '3': 5, '4': 4, '5': 2 },
  teams: [
    { team_id: 1, team_name: 'Alpha', distribution: { '1': 0, '2': 2, '3': 3, '4': 3, '5': 1 } },
    { team_id: 2, team_name: 'Beta', distribution: { '1': 1, '2': 1, '3': 2, '4': 1, '5': 1 } },
  ],
};

function flushInit(http: HttpTestingController) {
  http.expectOne(`${environment.apiUrl}/kpi/`).flush(kpiData);
  http.expectOne(`${environment.apiUrl}/kpi/level-distribution/`).flush(distData);
}

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
        provideRouter([]),
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
    flushInit(http);

    expect(component.data().length).toBe(2);
    expect(component.data()[0].team_name).toBe('Alpha');
    expect(component.loading()).toBeFalse();
  });

  it('shows empty state when no teams', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).flush([]);
    http.expectOne(`${environment.apiUrl}/kpi/level-distribution/`).flush(distData);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No team data available');
  });

  it('renders KPI cards', () => {
    fixture.detectChanges();
    flushInit(http);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Alpha');
    expect(el.textContent).toContain('3 members');
    expect(el.textContent).toContain('80%');
    expect(el.textContent).toContain('Beta');
  });

  it('keeps team details collapsed until asked', () => {
    fixture.detectChanges();
    flushInit(http);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Required skills');
    expect(component.isExpanded(1)).toBeFalse();
  });

  it('reveals required skills and members for one team at a time', () => {
    fixture.detectChanges();
    flushInit(http);

    component.toggleDetails(1);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Required skills');
    expect(el.textContent).toContain('Docker');
    expect(el.textContent).toContain('0 of 3');
    expect(el.textContent).toContain('Alice A');
    expect(component.isExpanded(2)).toBeFalse();
  });

  it('marks a requirement nobody meets', () => {
    fixture.detectChanges();
    flushInit(http);

    component.toggleDetails(1);
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.requirement-row');
    expect(rows[0].classList).toContain('requirement-unmet');
    expect(rows[1].classList).not.toContain('requirement-unmet');
  });

  it('collapses again on a second toggle', () => {
    fixture.detectChanges();
    flushInit(http);

    component.toggleDetails(1);
    component.toggleDetails(1);
    fixture.detectChanges();

    expect(component.isExpanded(1)).toBeFalse();
  });

  it('shows skeleton cards while loading', () => {
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.kpi-skeleton').length).toBe(3);

    flushInit(http);
    fixture.detectChanges();

    expect(el.querySelector('.kpi-skeleton')).toBeFalsy();
  });

  it('handles error gracefully', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).error(new ProgressEvent('error'));
    http.expectOne(`${environment.apiUrl}/kpi/level-distribution/`).flush(distData);

    expect(component.loading()).toBeFalse();
    expect(component.data().length).toBe(0);
  });

  it('builds bar chart config from data', () => {
    fixture.detectChanges();
    flushInit(http);

    const config = component.barChartConfig();
    expect(config.data.labels).toEqual(['Alpha', 'Beta']);
    expect(config.data.datasets.length).toBe(2);
    expect(config.data.datasets[0].data).toEqual([3.5, 2.0]);
    expect(config.data.datasets[1].data).toEqual([80, 50]);
  });

  it('builds doughnut config from distribution data', () => {
    fixture.detectChanges();
    flushInit(http);

    const config = component.doughnutConfig();
    expect(config).toBeTruthy();
    expect(config!.data.labels).toEqual(['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']);
    expect(config!.data.datasets[0].data).toEqual([1, 3, 5, 4, 2]);
  });

  it('returns null doughnut config when all zeros', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/kpi/`).flush(kpiData);
    http.expectOne(`${environment.apiUrl}/kpi/level-distribution/`).flush({
      overall: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      teams: [],
    });

    expect(component.doughnutConfig()).toBeNull();
  });
});
