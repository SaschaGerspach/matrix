import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateTestingModule } from '../../core/testing/translate-testing';

import { environment } from '../../../environments/environment';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  let fixture: ComponentFixture<SettingsComponent>;
  let component: SettingsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsComponent, TranslateTestingModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders password form and language selector', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Change Password');
    expect(el.textContent).toContain('Language');
  });

  it('calls change password API', () => {
    component.currentPassword = 'oldpass1!';
    component.newPassword = 'newpass1!';
    component.confirmPassword = 'newpass1!';
    component.changePassword();

    const req = http.expectOne(`${environment.apiUrl}/auth/change-password/`);
    expect(req.request.body).toEqual({
      current_password: 'oldpass1!',
      new_password: 'newpass1!',
    });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(component.passwordSuccess()).toBeTrue();
    expect(component.currentPassword).toBe('');
  });

  it('shows error on mismatched passwords', () => {
    component.currentPassword = 'oldpass1!';
    component.newPassword = 'newpass1!';
    component.confirmPassword = 'different';
    component.changePassword();

    expect(component.passwordError()).toBe('SETTINGS.PASSWORDS_MISMATCH');
  });

  it('shows error on wrong current password', () => {
    component.currentPassword = 'wrong';
    component.newPassword = 'newpass1!';
    component.confirmPassword = 'newpass1!';
    component.changePassword();

    http.expectOne(`${environment.apiUrl}/auth/change-password/`).error(
      new ProgressEvent('error'), { status: 400, statusText: 'Bad Request' },
    );

    expect(component.passwordError()).toBe('SETTINGS.WRONG_PASSWORD');
  });
});
