import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    translate = jasmine.createSpyObj('TranslateService', ['instant']);
    translate.instant.and.callFake((key: string) => `translated:${key}`);

    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MatSnackBar, useValue: snackBar },
        { provide: TranslateService, useValue: translate },
      ],
    });
    service = TestBed.inject(ToastService);
  });

  it('shows success toast with translated message', () => {
    service.success('TOAST.SKILL_CONFIRMED');
    expect(translate.instant).toHaveBeenCalledWith('TOAST.SKILL_CONFIRMED');
    expect(snackBar.open).toHaveBeenCalledWith('translated:TOAST.SKILL_CONFIRMED', '', {
      duration: 3000,
      panelClass: 'toast-success',
    });
  });

  it('shows error toast with longer duration', () => {
    service.error('TOAST.ERROR');
    expect(snackBar.open).toHaveBeenCalledWith('translated:TOAST.ERROR', '', {
      duration: 5000,
      panelClass: 'toast-error',
    });
  });
});
