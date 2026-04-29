import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { SkillAssignmentService } from './skill-assignment.service';
import { SkillCatalogService } from './skill-catalog.service';

describe('SkillCatalogService', () => {
  let service: SkillCatalogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SkillCatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches available skills', () => {
    service.listSkills().subscribe((data) => expect(data.length).toBe(1));
    http.expectOne(`${environment.apiUrl}/skills/`).flush([{ id: 1, name: 'Python', category: 1 }]);
  });
});

describe('SkillAssignmentService', () => {
  let service: SkillAssignmentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SkillAssignmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches my skills', () => {
    const mock = [{ id: 1, skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', confirmed_at: null, created_at: '2026-01-01' }];
    service.mySkills().subscribe((data) => expect(data).toEqual(mock));
    http.expectOne(`${environment.apiUrl}/my-skills/`).flush(mock);
  });

  it('creates an assignment', () => {
    service.createAssignment(1, 3, 10).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/skill-assignments/`);
    expect(req.request.body).toEqual({ skill: 1, level: 3, employee: 10 });
    req.flush({});
  });
});
