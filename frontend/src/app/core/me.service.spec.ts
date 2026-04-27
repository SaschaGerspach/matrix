import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../environments/environment';
import { MeService, MeProfile } from './me.service';

describe('MeService', () => {
  let service: MeService;
  let http: HttpTestingController;

  const profile: MeProfile = {
    id: 1, first_name: 'A', last_name: 'B', full_name: 'A B',
    email: 'a@b.com', user: 1, is_team_lead: false, is_admin: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches profile from /me/', () => {
    let result: MeProfile | undefined;
    service.getProfile().subscribe((p) => (result = p));
    http.expectOne(`${environment.apiUrl}/me/`).flush(profile);
    expect(result!.full_name).toBe('A B');
  });

  it('caches the profile (only one request)', () => {
    service.getProfile().subscribe();
    service.getProfile().subscribe();
    http.expectOne(`${environment.apiUrl}/me/`).flush(profile);
  });

  it('clearCache forces a new request', () => {
    service.getProfile().subscribe();
    http.expectOne(`${environment.apiUrl}/me/`).flush(profile);

    service.clearCache();

    service.getProfile().subscribe();
    http.expectOne(`${environment.apiUrl}/me/`).flush(profile);
  });
});
