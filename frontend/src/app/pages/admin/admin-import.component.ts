import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { TranslateModule } from '@ngx-translate/core';

import { CsvImportResult, EmployeeService } from '../../core/employee.service';
import { SkillCatalogService } from '../../core/skill-catalog.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-admin-import',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './admin-import.component.html',
  styleUrl: './admin-import.component.scss',
})
export class AdminImportComponent {
  private readonly employeeService = inject(EmployeeService);
  private readonly catalogService = inject(SkillCatalogService);
  private readonly toast = inject(ToastService);

  readonly employeeImportResult = signal<CsvImportResult | null>(null);
  readonly skillImportResult = signal<CsvImportResult | null>(null);

  onEmployeeCsvSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.employeeImportResult.set(null);
    this.employeeService.importCsv(file).subscribe({
      next: (result) => { this.employeeImportResult.set(result); this.toast.success('TOAST.IMPORT_COMPLETE'); },
      error: () => { this.employeeImportResult.set({ created: 0, skipped: 0, errors: [{ row: 0, detail: 'Import failed' }] }); this.toast.error('TOAST.ERROR'); },
    });
  }

  onSkillCsvSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.skillImportResult.set(null);
    this.catalogService.importSkillsCsv(file).subscribe({
      next: (result) => {
        this.skillImportResult.set(result);
        this.toast.success('TOAST.IMPORT_COMPLETE');
      },
      error: () => { this.skillImportResult.set({ created: 0, skipped: 0, errors: [{ row: 0, detail: 'Import failed' }] }); this.toast.error('TOAST.ERROR'); },
    });
  }
}
