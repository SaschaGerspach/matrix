import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { AdminImportComponent } from './admin-import.component';

describe('AdminImportComponent', () => {
  let fixture: ComponentFixture<AdminImportComponent>;
  let component: AdminImportComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminImportComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminImportComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('imports employees via CSV', () => {
    fixture.detectChanges();

    const file = new File(['first_name,last_name,email\nAda,Lovelace,ada@x.com'], 'e.csv', { type: 'text/csv' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onEmployeeCsvSelected(event);

    http.expectOne(`${environment.apiUrl}/employees/import-csv/`).flush({
      created: 1, skipped: 0, errors: [],
      details: { created: [{ row: 2, email: 'ada@x.com' }], skipped: [] },
    });

    expect(component.employeeImportResult()?.created).toBe(1);
  });

  it('imports skills via CSV', () => {
    fixture.detectChanges();

    const file = new File(['name,category\nPython,Programming'], 's.csv', { type: 'text/csv' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onSkillCsvSelected(event);

    http.expectOne(`${environment.apiUrl}/skills/import-csv/`).flush({
      created: 1, skipped: 0, errors: [],
      details: { created: [{ row: 2, name: 'Python', category: 'Programming' }], skipped: [] },
    });

    expect(component.skillImportResult()?.created).toBe(1);
  });

  it('handles employee import error', () => {
    fixture.detectChanges();

    const file = new File(['bad'], 'e.csv', { type: 'text/csv' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onEmployeeCsvSelected(event);

    http.expectOne(`${environment.apiUrl}/employees/import-csv/`).flush(null, { status: 400, statusText: 'Bad Request' });

    expect(component.employeeImportResult()?.created).toBe(0);
    expect(component.employeeImportResult()?.errors.length).toBe(1);
  });

  it('ignores empty file selection', () => {
    fixture.detectChanges();

    const event = { target: { files: [] } } as unknown as Event;
    component.onEmployeeCsvSelected(event);

    http.expectNone(`${environment.apiUrl}/employees/import-csv/`);
  });
});
