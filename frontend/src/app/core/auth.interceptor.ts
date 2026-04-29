import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { AuthService } from './auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthUrl = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  const authReq = !isAuthUrl && authService.getToken()
    ? req.clone({ setHeaders: { Authorization: `Bearer ${authService.getToken()}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthUrl) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshSubject.next(null);

        return authService.refresh().pipe(
          switchMap((tokens) => {
            isRefreshing = false;
            refreshSubject.next(tokens.access);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.access}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            authService.clearTokens();
            router.navigateByUrl('/login');
            return throwError(() => refreshError);
          }),
        );
      }

      return refreshSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap((token) => {
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
          });
          return next(retryReq);
        }),
      );
    }),
  );
};
