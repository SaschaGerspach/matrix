import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Legend } from 'chart.js';

import { environment } from '../../../environments/environment';
import { TeamComparisonComponent } from './team-comparison.component';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend);

const comparisonResponse = [
  { skill_id: 1, skill_name: 'Python', category_name: 'Programming', teams: { Alpha: 3.0, Beta: 5.0 } },
  { skill_id: 2, skill_name: 'Docker', category_name: 'Ops', teams: { Alpha: 1.5, Beta: 0 } },
];

describe('TeamComparisonComponent', () => {
  let fixture: ComponentFixture<TeamComparisonComponent>;
  let component: TeamComparisonComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamComparisonComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamComparisonComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads teams on init', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/teams/`).flush([
      { id: 1, name: 'Alpha', department: 1 },
      { id: 2, name: 'Beta', department: 1 },
    ]);

    expect(component.teams().length).toBe(2);
  });

  it('fetches comparison data and builds chart', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/teams/`).flush([]);

    component.selectedTeamIds = [1, 2];
    component.compare();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/team-comparison/`);
    expect(req.request.params.getAll('teams')).toEqual(['1', '2']);
    req.flush(comparisonResponse);

    expect(component.hasData()).toBeTrue();
    expect(component.barData.datasets.length).toBe(2);
    expect(component.barData.labels?.length).toBe(2);
  });

  it('does not compare with less than 2 teams', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/teams/`).flush([]);

    component.selectedTeamIds = [1];
    component.compare();
    // no HTTP request — afterEach verifies
  });

  it('filters out skills with no data', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/teams/`).flush([]);

    component.selectedTeamIds = [1, 2];
    component.compare();

    http.expectOne((r) => r.url === `${environment.apiUrl}/team-comparison/`).flush([
      { skill_id: 1, skill_name: 'Python', category_name: 'Programming', teams: { Alpha: 3.0, Beta: 5.0 } },
      { skill_id: 2, skill_name: 'Unused', category_name: 'Other', teams: { Alpha: 0, Beta: 0 } },
    ]);

    expect(component.barData.labels).toEqual(['Python']);
  });

  it('builds radar data alongside bar data', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/teams/`).flush([]);

    component.selectedTeamIds = [1, 2];
    component.compare();

    http.expectOne((r) => r.url === `${environment.apiUrl}/team-comparison/`).flush(comparisonResponse);

    expect(component.radarData.datasets.length).toBe(2);
    expect(component.radarData.labels).toEqual(['Python', 'Docker']);
    expect(component.radarData.datasets[0].label).toBe('Alpha');
  });

  it('defaults to bar chart mode', () => {
    expect(component.chartMode).toBe('bar');
  });
});
