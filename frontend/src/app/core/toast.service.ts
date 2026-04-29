import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  success(translationKey: string): void {
    const message = this.translate.instant(translationKey);
    this.snackBar.open(message, '', { duration: 3000, panelClass: 'toast-success' });
  }

  error(translationKey: string): void {
    const message = this.translate.instant(translationKey);
    this.snackBar.open(message, '', { duration: 5000, panelClass: 'toast-error' });
  }
}
