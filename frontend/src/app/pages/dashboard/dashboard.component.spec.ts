import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { DashboardComponent } from './dashboard.component';

const meProfile = {
  id: 1, first_name: 'A', last_name: 'B', full_name: 'A B',
  email: 'a@b.com', user: 1, is_team_lead: false, is_admin: false,
};

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
    { id: 100, employee: 1, skill: 10, level: 4, status: 'confirmed' },
    { id: 101, employee: 2, skill: 11, level: 2, status: 'pending' },
  ],
};

function flushInitRequests(http: HttpTestingController, matrix = matrixResponse, profile = meProfile): void {
  http.expectOne(`${environment.apiUrl}/me/`).flush(profile);
  http.expectOne(`${environment.apiUrl}/teams/`).flush([]);
  http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([]);
  http.expectOne(`${environment.apiUrl}/skills/`).flush([]);
  http.expectOne((r) => r.url === `${environment.apiUrl}/skill-matrix/`).flush(matrix);
}

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent, TranslateTestingModule],
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
    flushInitRequests(http);

    expect(component.employees().length).toBe(2);
    expect(component.skills().length).toBe(2);
    expect(component.loading()).toBeFalse();
  });

  it('builds grid columns from skills', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    expect(component.gridColumns()).toBe('180px repeat(2, minmax(100px, 1fr))');
  });

  it('returns level for existing assignment', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    expect(component.getLevel(1, 10)).toBe(4);
  });

  it('returns null for missing assignment', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    expect(component.getLevel(1, 11)).toBeNull();
  });

  it('shows empty state when no employees', () => {
    fixture.detectChanges();
    flushInitRequests(http, { employees: [], skills: [], assignments: [] });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No employees found');
  });

  it('shows skeleton rows while loading', () => {
    fixture.detectChanges();

    expect(component.loading()).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.skeleton-row').length).toBe(8);

    flushInitRequests(http);
  });

  it('renders a legend covering unassessed plus every level', () => {
    fixture.detectChanges();
    flushInitRequests(http);
    fixture.detectChanges();

    const swatches = fixture.nativeElement.querySelectorAll('.legend-swatch') as NodeListOf<HTMLElement>;
    expect(Array.from(swatches).map((s) => s.getAttribute('data-heat')))
      .toEqual(['0', '1', '2', '3', '4', '5']);
  });

  // The virtual scroll viewport only materialises rows once it has measured
  // itself, which needs a turn of the microtask queue in tests.
  function renderMatrixRows(): void {
    tick();
    fixture.detectChanges();
    fixture.debugElement
      .query(By.directive(CdkVirtualScrollViewport))
      .injector.get(CdkVirtualScrollViewport)
      .checkViewportSize();
    tick();
    fixture.detectChanges();
  }

  it('renders employee names as real links so they are keyboard reachable', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    const link = fixture.nativeElement.querySelector('.employee-link') as HTMLAnchorElement | null;
    expect(link).toBeTruthy();
    expect(link!.tagName).toBe('A');
    expect(link!.getAttribute('href')).toBe('/employees/1');
  }));

  it('exposes grid semantics including counts that survive virtual scrolling', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    const el = fixture.nativeElement as HTMLElement;
    const grid = el.querySelector('[role="grid"]')!;
    expect(grid.getAttribute('aria-rowcount')).toBe('3');
    expect(grid.getAttribute('aria-colcount')).toBe('3');

    expect(el.querySelectorAll('[role="columnheader"]').length).toBe(3);
    expect(el.querySelector('[role="rowheader"]')).toBeTruthy();

    const firstRow = el.querySelector('.matrix-row')!;
    expect(firstRow.getAttribute('role')).toBe('row');
    expect(firstRow.getAttribute('aria-rowindex')).toBe('2');
  }));

  it('labels each cell with employee, skill and level', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    const cell = fixture.nativeElement.querySelector('[data-row="0"][data-col="0"]') as HTMLElement;
    expect(cell.getAttribute('aria-label')).toBe('Alice A, Python: level 4 of 5');

    const empty = fixture.nativeElement.querySelector('[data-row="0"][data-col="1"]') as HTMLElement;
    expect(empty.getAttribute('aria-label')).toBe('Alice A, Docker: not assessed');
  }));

  it('marks cells read-only for users who cannot edit', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    const cell = fixture.nativeElement.querySelector('[data-row="0"][data-col="0"]') as HTMLElement;
    expect(cell.getAttribute('aria-readonly')).toBe('true');
  }));

  it('keeps exactly one cell in the tab order', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    const tabbable = fixture.nativeElement.querySelectorAll('[role="gridcell"][tabindex="0"]');
    expect(tabbable.length).toBe(1);
    expect(tabbable[0].getAttribute('data-row')).toBe('0');
    expect(tabbable[0].getAttribute('data-col')).toBe('0');
  }));

  it('moves the focused cell with arrow keys and clamps at the edges', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), 0, 0, 1, 10);
    expect(component.focusedCell()).toEqual({ row: 0, col: 1 });

    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), 0, 1, 1, 11);
    expect(component.focusedCell()).toEqual({ row: 1, col: 1 });

    // Two skills and two employees, so both moves are already at the edge.
    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }), 1, 1, 2, 11);
    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }), 1, 1, 2, 11);
    expect(component.focusedCell()).toEqual({ row: 1, col: 1 });

    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'Home' }), 1, 1, 2, 11);
    expect(component.focusedCell()).toEqual({ row: 1, col: 0 });

    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'End' }), 1, 0, 2, 10);
    expect(component.focusedCell()).toEqual({ row: 1, col: 1 });

    flush();
  }));

  it('starts editing on Enter only when editing is allowed', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 0, 0, 1, 10);
    expect(component.editingCell).toBeNull();
  }));

  it('starts editing on Enter for team leads', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http, matrixResponse, { ...meProfile, is_team_lead: true });
    renderMatrixRows();

    component.onCellKeydown(new KeyboardEvent('keydown', { key: 'Enter' }), 0, 0, 1, 10);
    expect(component.isEditing(1, 10)).toBeTrue();
  }));

  it('resets the tab stop when filters return a smaller result set', fakeAsync(() => {
    fixture.detectChanges();
    flushInitRequests(http);
    renderMatrixRows();

    component.focusedCell.set({ row: 1, col: 1 });
    component.applyFilters();
    http.expectOne((r) => r.url === `${environment.apiUrl}/skill-matrix/`).flush({
      employees: [{ id: 1, full_name: 'Alice A' }],
      skills: [{ id: 10, name: 'Python', category_name: 'Programming' }],
      assignments: [],
    });

    expect(component.focusedCell()).toEqual({ row: 0, col: 0 });
    flush();
  }));

  it('renders export buttons', () => {
    fixture.detectChanges();
    flushInitRequests(http);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Export CSV');
    expect(el.textContent).toContain('Export PDF');
  });

  it('calls export endpoint on exportCsv', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.exportCsv();
    const req = http.expectOne(`${environment.apiUrl}/skill-matrix/export/`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['Employee,Python\r\nAlice A,4\r\n'], { type: 'text/csv' }));
  });

  it('calls PDF export endpoint on exportPdf', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.exportPdf();
    const req = http.expectOne(`${environment.apiUrl}/skill-matrix/export-pdf/`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  });

  it('reloads with filters when applyFilters is called', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.selectedTeam = 5;
    component.applyFilters();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/skill-matrix/`);
    expect(req.request.params.get('team')).toBe('5');
    req.flush(matrixResponse);
  });

  it('clears filters and reloads', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.selectedTeam = 5;
    component.searchTerm = 'test';
    component.clearFilters();

    expect(component.selectedTeam).toBeUndefined();
    expect(component.searchTerm).toBe('');

    http.expectOne((r) => r.url === `${environment.apiUrl}/skill-matrix/`).flush(matrixResponse);
  });

  it('canEdit is false for regular users', () => {
    fixture.detectChanges();
    flushInitRequests(http);
    expect(component.canEdit()).toBeFalse();
  });

  it('canEdit is true for team leads', () => {
    fixture.detectChanges();
    flushInitRequests(http, matrixResponse, { ...meProfile, is_team_lead: true });
    expect(component.canEdit()).toBeTrue();
  });

  it('canEdit is true for admins', () => {
    fixture.detectChanges();
    flushInitRequests(http, matrixResponse, { ...meProfile, is_admin: true });
    expect(component.canEdit()).toBeTrue();
  });

  it('startEdit sets editingCell when canEdit is true', () => {
    fixture.detectChanges();
    flushInitRequests(http, matrixResponse, { ...meProfile, is_team_lead: true });

    component.startEdit(1, 10);
    expect(component.isEditing(1, 10)).toBeTrue();
    expect(component.isEditing(1, 11)).toBeFalse();
  });

  it('startEdit does nothing when canEdit is false', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.startEdit(1, 10);
    expect(component.editingCell).toBeNull();
  });

  it('setLevel updates existing assignment via PATCH', () => {
    fixture.detectChanges();
    flushInitRequests(http, matrixResponse, { ...meProfile, is_team_lead: true });

    component.setLevel(1, 10, 5);

    const req = http.expectOne(`${environment.apiUrl}/skill-assignments/100/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ level: 5 });
    req.flush({ id: 100, employee: 1, skill: 10, level: 5, status: 'confirmed' });

    expect(component.getLevel(1, 10)).toBe(5);
  });

  it('setLevel creates new assignment via POST', () => {
    fixture.detectChanges();
    flushInitRequests(http, matrixResponse, { ...meProfile, is_team_lead: true });

    component.setLevel(1, 11, 3);

    const req = http.expectOne(`${environment.apiUrl}/skill-assignments/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ skill: 11, level: 3, employee: 1 });
    req.flush({ id: 200, employee: 1, skill: 11, level: 3, status: 'pending' });

    expect(component.getLevel(1, 11)).toBe(3);
  });

  it('setLevel does nothing when level is unchanged', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.setLevel(1, 10, 4);
    // no HTTP request expected — afterEach verifies
  });

  it('cancelEdit clears editingCell', () => {
    fixture.detectChanges();
    flushInitRequests(http, matrixResponse, { ...meProfile, is_team_lead: true });

    component.startEdit(1, 10);
    expect(component.editingCell).not.toBeNull();
    component.cancelEdit();
    expect(component.editingCell).toBeNull();
  });
});
