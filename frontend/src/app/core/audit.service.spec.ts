import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches audit log entries', () => {
    const response = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, username: 'admin', action: 'create', entity_type: 'Skill', entity_id: 1, detail: 'Created Python', timestamp: '2026-04-29T10:00:00Z' }],
    };

    service.list().subscribe((result) => {
      expect(result.results.length).toBe(1);
      expect(result.results[0].action).toBe('create');
    });

    const req = http.expectOne(`${environment.apiUrl}/audit-log/`);
    expect(req.request.method).toBe('GET');
    req.flush(response);
  });
});
