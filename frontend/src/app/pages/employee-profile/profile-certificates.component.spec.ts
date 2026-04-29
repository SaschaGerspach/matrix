import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { ProfileCertificatesComponent } from './profile-certificates.component';

const certsResponse = { count: 0, next: null, previous: null, results: [] };

describe('ProfileCertificatesComponent', () => {
  let fixture: ComponentFixture<ProfileCertificatesComponent>;
  let component: ProfileCertificatesComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileCertificatesComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileCertificatesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('employeeId', 1);
    fixture.componentRef.setInput('canEdit', true);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads certificates on init', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/certificates/`).flush(certsResponse);

    expect(component.certificates().length).toBe(0);
  });

  it('rejects files with invalid type', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/certificates/`).flush(certsResponse);

    const file = new File(['content'], 'script.exe', { type: 'application/octet-stream' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);
    expect(component.certFile).toBeNull();
    expect(component.certFileError).toBe('CERTIFICATES.INVALID_FILE_TYPE');
  });

  it('rejects files that are too large', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/certificates/`).flush(certsResponse);

    const blob = new Blob([new ArrayBuffer(11 * 1024 * 1024)], { type: 'application/pdf' });
    const file = new File([blob], 'big.pdf', { type: 'application/pdf' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);
    expect(component.certFile).toBeNull();
    expect(component.certFileError).toBe('CERTIFICATES.FILE_TOO_LARGE');
  });

  it('accepts valid PDF files', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/certificates/`).flush(certsResponse);

    const file = new File(['%PDF-1.4'], 'cert.pdf', { type: 'application/pdf' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);
    expect(component.certFile).toBe(file);
    expect(component.certFileError).toBe('');
  });

  it('toggles form visibility', () => {
    fixture.detectChanges();
    http.expectOne((r) => r.url === `${environment.apiUrl}/certificates/`).flush(certsResponse);

    expect(component.showForm()).toBeFalse();
    component.toggleForm();
    expect(component.showForm()).toBeTrue();
    component.toggleForm();
    expect(component.showForm()).toBeFalse();
  });
});
