import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { SkillService } from './skill.service';

describe('SkillService', () => {
  let service: SkillService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SkillService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches my skills', () => {
    const mock = [{ id: 1, skill: 1, skill_name: 'Python', category_name: 'Programming', level: 3, status: 'pending', confirmed_at: null, created_at: '2026-01-01' }];
    service.mySkills().subscribe((data) => expect(data).toEqual(mock));
    http.expectOne(`${environment.apiUrl}/my-skills/`).flush(mock);
  });

  it('fetches available skills', () => {
    service.listSkills().subscribe((data) => expect(data.length).toBe(1));
    http.expectOne(`${environment.apiUrl}/skills/`).flush([{ id: 1, name: 'Python', category: 1 }]);
  });

  it('creates an assignment', () => {
    service.createAssignment(1, 3, 10).subscribe();
    const req = http.expectOne(`${environment.apiUrl}/skill-assignments/`);
    expect(req.request.body).toEqual({ skill: 1, level: 3, employee: 10 });
    req.flush({});
  });
});
