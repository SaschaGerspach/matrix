import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';
import { CertificateService } from './certificate.service';

describe('CertificateService', () => {
  let service: CertificateService;
  let http: HttpTestingController;

  const mockCert = {
    id: 1, employee: 1, employee_name: 'Alice A', skill: null,
    skill_name: null, name: 'AWS Cert', issuer: 'Amazon',
    issued_date: '2026-01-01', expiry_date: '2027-01-01',
    file: null, created_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CertificateService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists certificates without filter', () => {
    service.list().subscribe((res) => {
      expect(res.results.length).toBe(1);
    });

    const req = http.expectOne(`${environment.apiUrl}/certificates/`);
    expect(req.request.method).toBe('GET');
    req.flush({ count: 1, next: null, previous: null, results: [mockCert] });
  });

  it('lists certificates filtered by employee', () => {
    service.list(42).subscribe();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/certificates/` && r.params.get('employee') === '42');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 0, next: null, previous: null, results: [] });
  });

  it('gets a single certificate', () => {
    service.get(1).subscribe((cert) => {
      expect(cert.name).toBe('AWS Cert');
    });

    const req = http.expectOne(`${environment.apiUrl}/certificates/1/`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCert);
  });

  it('creates a certificate', () => {
    const formData = new FormData();
    formData.append('name', 'New Cert');
    service.create(formData).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/certificates/`);
    expect(req.request.method).toBe('POST');
    req.flush(mockCert);
  });

  it('updates a certificate', () => {
    service.update(1, { name: 'Updated' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/certificates/1/`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockCert);
  });

  it('deletes a certificate', () => {
    service.delete(1).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/certificates/1/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });
});
