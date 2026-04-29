import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { AdminRoleTemplatesComponent } from './admin-role-templates.component';

describe('AdminRoleTemplatesComponent', () => {
  let fixture: ComponentFixture<AdminRoleTemplatesComponent>;
  let component: AdminRoleTemplatesComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRoleTemplatesComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRoleTemplatesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('skills', [{ id: 1, name: 'Python', category: 1 }]);
    fixture.componentRef.setInput('teams', [{ id: 1, name: 'Core', department: 1 }]);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads templates on init', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/role-templates/`).flush([
      { id: 1, name: 'Backend Dev', description: '', skills: [] },
    ]);

    expect(component.roleTemplates().length).toBe(1);
  });

  it('creates a role template', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/role-templates/`).flush([]);

    component.newTemplateName = 'Frontend Dev';
    component.newTemplateDesc = 'Frontend role';
    component.addRoleTemplate();

    http.expectOne(`${environment.apiUrl}/role-templates/`).flush({ id: 2, name: 'Frontend Dev', description: 'Frontend role', skills: [] });
    http.expectOne(`${environment.apiUrl}/role-templates/`).flush([
      { id: 2, name: 'Frontend Dev', description: 'Frontend role', skills: [] },
    ]);

    expect(component.roleTemplates().length).toBe(1);
    expect(component.newTemplateName).toBe('');
  });

  it('does not create template with empty name', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/role-templates/`).flush([]);

    component.newTemplateName = '   ';
    component.addRoleTemplate();

    http.expectNone(`${environment.apiUrl}/role-templates/`);
  });

  it('deletes a role template', () => {
    fixture.detectChanges();
    http.expectOne(`${environment.apiUrl}/role-templates/`).flush([
      { id: 1, name: 'Backend Dev', description: '', skills: [] },
    ]);

    component.deleteRoleTemplate(1);

    http.expectOne(`${environment.apiUrl}/role-templates/1/`).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${environment.apiUrl}/role-templates/`).flush([]);

    expect(component.roleTemplates().length).toBe(0);
  });
});
