import { Component, DestroyRef, ElementRef, OnInit, effect, inject, signal, computed, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { RouterLink } from '@angular/router';

import { TranslateModule } from '@ngx-translate/core';
import { Subject, catchError, EMPTY, switchMap } from 'rxjs';

import { SkillAnalyticsService } from '../../core/skill-analytics.service';
import { SkillAssignmentService } from '../../core/skill-assignment.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { MatrixAssignment, MatrixEmployee, MatrixSkill, SkillCategory } from '../../core/skill.models';
import { MeService } from '../../core/me.service';
import { Team, TeamService } from '../../core/team.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    RouterLink,
    ScrollingModule,
    TranslateModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly catalogService = inject(SkillCatalogService);
  private readonly analyticsService = inject(SkillAnalyticsService);
  private readonly assignmentService = inject(SkillAssignmentService);
  private readonly meService = inject(MeService);
  private readonly teamService = inject(TeamService);
  private readonly destroyRef = inject(DestroyRef);

  readonly employees = signal<MatrixEmployee[]>([]);
  readonly skills = signal<MatrixSkill[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly categories = signal<SkillCategory[]>([]);
  readonly loading = signal(false);
  readonly canEdit = signal(false);

  readonly levels = [1, 2, 3, 4, 5];
  readonly skeletonRows = [1, 2, 3, 4, 5, 6, 7, 8];
  editingCell: { employeeId: number; skillId: number } | null = null;

  // Roving tabindex: exactly one cell is in the tab order, arrow keys move it.
  readonly focusedCell = signal({ row: 0, col: 0 });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewport = viewChild<CdkVirtualScrollViewport>('matrixViewport');
  private readonly matrixHeader = viewChild<ElementRef<HTMLElement>>('matrixHeader');

  constructor() {
    effect((onCleanup) => {
      const viewport = this.viewport();
      if (!viewport) return;

      // The CDK inserts two plain divs between the grid and its rows, which
      // breaks the required grid > row relationship. Marking them presentational
      // lets the rows read as direct children of the grid.
      const element = viewport.elementRef.nativeElement;
      element.querySelector('.cdk-virtual-scroll-content-wrapper')
        ?.setAttribute('role', 'presentation');

      // elementScrolled runs outside the Angular zone, so following the header
      // along does not trigger change detection on every scroll frame.
      const sub = viewport.elementScrolled().subscribe(
        () => this.syncHeaderScroll(element.scrollLeft),
      );
      onCleanup(() => sub.unsubscribe());

      // Measured after layout, because the vertical scrollbar only exists once
      // the rows are rendered.
      requestAnimationFrame(() => {
        this.applyHeaderGutter(element.offsetWidth - element.clientWidth);
      });
    });
  }

  syncHeaderScroll(scrollLeft: number): void {
    const header = this.matrixHeader()?.nativeElement;
    if (header) {
      header.scrollLeft = scrollLeft;
    }
  }

  // The viewport loses width to its vertical scrollbar, the header does not.
  // Left alone the header lays its columns out over a wider box and runs out of
  // scroll distance sooner, so the last stretch of a sideways scroll moves the
  // levels while the skill names already stand still.
  applyHeaderGutter(gutter: number): void {
    const header = this.matrixHeader()?.nativeElement;
    if (header) {
      header.style.width = gutter > 0 ? `calc(100% - ${gutter}px)` : '';
    }
  }

  selectedTeam: number | undefined;
  selectedCategory: number | undefined;
  searchTerm = '';

  private assignmentMap = new Map<string, MatrixAssignment>();
  private descriptionMap = new Map<string, string>();
  private readonly loadTrigger$ = new Subject<void>();

  readonly gridColumns = computed(() => {
    const skillCount = this.skills().length;
    return `180px repeat(${skillCount}, minmax(100px, 1fr))`;
  });

  ngOnInit(): void {
    this.meService.getProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      this.canEdit.set(p.is_team_lead || p.is_admin);
    });
    this.teamService.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((t) => this.teams.set(t));
    this.catalogService.listCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((c) => this.categories.set(c));
    this.catalogService.listSkills().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((skills) => {
      for (const skill of skills) {
        for (const desc of skill.level_descriptions ?? []) {
          this.descriptionMap.set(`${skill.id}_${desc.level}`, desc.description);
        }
      }
    });

    this.loadTrigger$.pipe(
      switchMap(() => {
        this.loading.set(true);
        return this.analyticsService.skillMatrix({
          team: this.selectedTeam,
          category: this.selectedCategory,
          search: this.searchTerm || undefined,
        }).pipe(
          catchError(() => {
            this.loading.set(false);
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((data) => {
      this.employees.set(data.employees);
      this.skills.set(data.skills);
      this.assignmentMap.clear();
      for (const a of data.assignments) {
        this.assignmentMap.set(`${a.employee}_${a.skill}`, a);
      }
      // Without this the tab stop could point at a cell the new result set no
      // longer has, leaving the grid unreachable by keyboard.
      this.focusedCell.set({ row: 0, col: 0 });
      this.loading.set(false);
    });

    this.loadMatrix();
  }

  loadMatrix(): void {
    this.loadTrigger$.next();
  }

  applyFilters(): void {
    this.loadMatrix();
  }

  clearFilters(): void {
    this.selectedTeam = undefined;
    this.selectedCategory = undefined;
    this.searchTerm = '';
    this.loadMatrix();
  }

  getLevel(employeeId: number, skillId: number): number | null {
    const a = this.assignmentMap.get(`${employeeId}_${skillId}`);
    return a ? a.level : null;
  }

  getLevelTooltip(skillId: number, level: number | null): string {
    if (!level) return '';
    return this.descriptionMap.get(`${skillId}_${level}`) ?? '';
  }

  startEdit(employeeId: number, skillId: number): void {
    if (this.canEdit()) {
      this.editingCell = { employeeId, skillId };
    }
  }

  cancelEdit(): void {
    this.editingCell = null;
  }

  isEditing(employeeId: number, skillId: number): boolean {
    return this.editingCell?.employeeId === employeeId && this.editingCell?.skillId === skillId;
  }

  isFocusedCell(row: number, col: number): boolean {
    const focused = this.focusedCell();
    return focused.row === row && focused.col === col;
  }

  onCellFocus(row: number, col: number): void {
    this.focusedCell.set({ row, col });
  }

  onCellKeydown(event: KeyboardEvent, row: number, col: number, employeeId: number, skillId: number): void {
    switch (event.key) {
      case 'ArrowRight': this.moveFocus(row, col + 1); break;
      case 'ArrowLeft': this.moveFocus(row, col - 1); break;
      case 'ArrowDown': this.moveFocus(row + 1, col); break;
      case 'ArrowUp': this.moveFocus(row - 1, col); break;
      case 'Home': this.moveFocus(row, 0); break;
      case 'End': this.moveFocus(row, this.skills().length - 1); break;
      case 'Enter':
      case ' ':
        if (!this.canEdit()) return;
        this.startEdit(employeeId, skillId);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  private moveFocus(row: number, col: number): void {
    const rowCount = this.employees().length;
    const colCount = this.skills().length;
    if (!rowCount || !colCount) return;

    const nextRow = Math.min(Math.max(row, 0), rowCount - 1);
    const nextCol = Math.min(Math.max(col, 0), colCount - 1);
    this.focusedCell.set({ row: nextRow, col: nextCol });

    // Rows outside the rendered window are not in the DOM, so scroll them into
    // range first; the viewport materialises them on a later frame.
    if (!this.cellElement(nextRow, nextCol)) {
      this.viewport()?.scrollToIndex(nextRow);
    }
    requestAnimationFrame(() => {
      const cell = this.cellElement(nextRow, nextCol);
      if (cell) {
        cell.focus();
      } else {
        requestAnimationFrame(() => this.cellElement(nextRow, nextCol)?.focus());
      }
    });
  }

  private cellElement(row: number, col: number): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>(
      `[data-row="${row}"][data-col="${col}"]`,
    );
  }

  setLevel(employeeId: number, skillId: number, level: number): void {
    this.editingCell = null;
    const key = `${employeeId}_${skillId}`;
    const existing = this.assignmentMap.get(key);
    const currentLevel = existing?.level ?? 0;

    if (level === currentLevel) return;

    if (existing && level > 0) {
      const prev = { ...existing };
      this.assignmentMap.set(key, { ...existing, level });
      this.assignmentService.updateAssignment(existing.id, level).subscribe({
        error: () => this.assignmentMap.set(key, prev),
      });
    } else if (!existing && level > 0) {
      const temp: MatrixAssignment = { id: 0, employee: employeeId, skill: skillId, level, status: 'pending' };
      this.assignmentMap.set(key, temp);
      this.assignmentService.createAssignment(skillId, level, employeeId).subscribe({
        next: (result) => this.assignmentMap.set(key, { ...temp, id: result.id }),
        error: () => this.assignmentMap.delete(key),
      });
    }
  }

  exportCsv(): void {
    this.analyticsService.exportMatrixCsv().subscribe({
      next: (blob) => this.downloadBlob(blob, 'skill-matrix.csv'),
      error: () => {},
    });
  }

  exportPdf(): void {
    this.analyticsService.exportMatrixPdf().subscribe({
      next: (blob) => this.downloadBlob(blob, 'skill-matrix.pdf'),
      error: () => {},
    });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
