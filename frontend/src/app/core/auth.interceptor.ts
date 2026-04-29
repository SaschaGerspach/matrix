import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { AuthService } from './auth.service';

let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean>(false);

function getCsrfToken(): string | null {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : null;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthUrl = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  let headers: Record<string, string> = {};
  const csrf = getCsrfToken();
  if (csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    headers['X-CSRFToken'] = csrf;
  }

  const authReq = req.clone({ setHeaders: headers, withCredentials: true });

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthUrl) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshSubject.next(false);

        return authService.refresh().pipe(
          switchMap(() => {
            isRefreshing = false;
            refreshSubject.next(true);
            return next(req.clone({ setHeaders: headers, withCredentials: true }));
          }),
          catchError((refreshError) => {
            isRefreshing = false;
            authService.clearSession();
            router.navigateByUrl('/login');
            return throwError(() => refreshError);
          }),
        );
      }

      return refreshSubject.pipe(
        filter((done) => done),
        take(1),
        switchMap(() => next(req.clone({ setHeaders: headers, withCredentials: true }))),
      );
    }),
  );
};
