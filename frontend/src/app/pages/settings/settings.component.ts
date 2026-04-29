import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly langService = inject(LanguageService);

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly passwordError = signal('');
  readonly passwordSuccess = signal(false);

  changePassword(): void {
    this.passwordError.set('');
    this.passwordSuccess.set(false);

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('SETTINGS.PASSWORDS_MISMATCH');
      return;
    }

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.passwordSuccess.set(true);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.toast.success('TOAST.PASSWORD_CHANGED');
      },
      error: () => {
        this.passwordError.set('SETTINGS.WRONG_PASSWORD');
      },
    });
  }

  setLanguage(lang: string): void {
    if (lang !== this.langService.currentLang()) {
      this.langService.toggle();
    }
  }
}
