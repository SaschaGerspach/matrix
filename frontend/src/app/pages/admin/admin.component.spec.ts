import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AdminComponent } from './admin.component';

function flushInitRequests(http: HttpTestingController): void {
  http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([
    { id: 1, name: 'Programming', parent: null },
  ]);
  http.expectOne(`${environment.apiUrl}/skills/`).flush([
    { id: 1, name: 'Python', category: 1 },
  ]);
  http.expectOne(`${environment.apiUrl}/teams/`).flush([
    { id: 1, name: 'Core', department: 1 },
  ]);
  http.expectOne(`${environment.apiUrl}/skill-requirements/`).flush([]);
  http.expectOne(`${environment.apiUrl}/skill-level-descriptions/`).flush([]);
  http.expectOne(`${environment.apiUrl}/role-templates/`).flush([]);
}

describe('AdminComponent', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let component: AdminComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads all data on init', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    expect(component.categories().length).toBe(1);
    expect(component.skills().length).toBe(1);
    expect(component.teams().length).toBe(1);
  });

  it('adds a category', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.newCategoryName = 'Ops';
    component.addCategory();

    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush({ id: 2, name: 'Ops', parent: null });
    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([
      { id: 1, name: 'Programming', parent: null },
      { id: 2, name: 'Ops', parent: null },
    ]);

    expect(component.categories().length).toBe(2);
    expect(component.newCategoryName).toBe('');
  });

  it('deletes a category', () => {
    fixture.detectChanges();
    flushInitRequests(http);

    component.deleteCategory(1);

    http.expectOne(`${environment.apiUrl}/skill-categories/1/`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${environment.apiUrl}/skill-categories/`).flush([]);

    expect(component.categories().length).toBe(0);
  });
});
