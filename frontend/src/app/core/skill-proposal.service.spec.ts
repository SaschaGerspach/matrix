import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { SkillProposalService } from './skill-proposal.service';

describe('SkillProposalService', () => {
  let service: SkillProposalService;
  let http: HttpTestingController;

  const mockProposal = {
    id: 1, proposed_by: 1, proposed_by_name: 'Alice A',
    skill_name: 'Rust', category: 1, category_name: 'Programming',
    reason: 'Needed for new project', status: 'pending' as const,
    reviewed_by: null, reviewed_by_name: null, review_note: '',
    created_at: '2026-04-29T00:00:00Z', reviewed_at: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SkillProposalService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists proposals without filter', () => {
    service.list().subscribe((res) => {
      expect(res.results.length).toBe(1);
    });

    const req = http.expectOne(`${environment.apiUrl}/skill-proposals/`);
    expect(req.request.method).toBe('GET');
    req.flush({ count: 1, next: null, previous: null, results: [mockProposal] });
  });

  it('lists proposals filtered by status', () => {
    service.list('pending').subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/skill-proposals/` && r.params.get('status') === 'pending');
    req.flush({ count: 1, next: null, previous: null, results: [mockProposal] });
  });

  it('creates a proposal', () => {
    service.create({ proposed_by: 1, skill_name: 'Rust', category: 1, reason: 'Need it' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/skill-proposals/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.skill_name).toBe('Rust');
    req.flush(mockProposal);
  });

  it('approves a proposal', () => {
    service.approve(1, 'Looks good').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/skill-proposals/1/approve/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ review_note: 'Looks good' });
    req.flush({ ...mockProposal, status: 'approved' });
  });

  it('rejects a proposal', () => {
    service.reject(1, 'Not needed').subscribe();

    const req = http.expectOne(`${environment.apiUrl}/skill-proposals/1/reject/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ review_note: 'Not needed' });
    req.flush({ ...mockProposal, status: 'rejected' });
  });

  it('deletes a proposal', () => {
    service.delete(1).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/skill-proposals/1/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
