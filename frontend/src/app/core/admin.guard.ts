import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { MeService } from './me.service';

export const adminGuard: CanActivateFn = () => {
  const me = inject(MeService);
  const router = inject(Router);
  return me.getProfile().pipe(
    map((p) => p.is_admin || router.createUrlTree(['/my-skills'])),
  );
};
