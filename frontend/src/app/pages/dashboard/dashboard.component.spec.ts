import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { DashboardComponent } from './dashboard.component';

const matrixResponse = {
  employees: [
    { id: 1, full_name: 'Alice A' },
    { id: 2, full_name: 'Bob B' },
  ],
  skills: [
    { id: 10, name: 'Python', category_name: 'Programming' },
    { id: 11, name: 'Docker', category_name: 'Ops' },
  ],
  assignments: [
    { employee: 1, skill: 10, level: 4, status: 'confirmed' },
    { employee: 2, skill: 11, level: 2, status: 'pending' },
  ],
};

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads matrix data on init', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-matrix/`).flush(matrixResponse);

    expect(component.employees().length).toBe(2);
    expect(component.skills().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('builds correct column list', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-matrix/`).flush(matrixResponse);

    expect(component.displayedColumns()).toEqual(['employee', 'skill_10', 'skill_11']);
  });

  it('returns level for existing assignment', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-matrix/`).flush(matrixResponse);

    expect(component.getLevel(1, 10)).toBe(4);
  });

  it('returns null for missing assignment', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-matrix/`).flush(matrixResponse);

    expect(component.getLevel(1, 11)).toBeNull();
  });

  it('shows empty state when no employees', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-matrix/`).flush({ employees: [], skills: [], assignments: [] });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No employees found');
  });

  it('renders export button', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-matrix/`).flush(matrixResponse);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Export CSV');
  });

  it('calls export endpoint on exportCsv', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/skill-matrix/`).flush(matrixResponse);

    component.exportCsv();
    const req = http.expectOne(`${environment.apiUrl}/skill-matrix/export/`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['Employee,Python\r\nAlice A,4\r\n'], { type: 'text/csv' }));
  });
});
