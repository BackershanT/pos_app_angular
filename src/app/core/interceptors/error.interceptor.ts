import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notification = inject(NotificationService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected server error occurred.';

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        // Backend returned an unsuccessful response code
        switch (error.status) {
          case 401:
            errorMessage = 'Session expired. Please log in again.';
            router.navigate(['/pos']);
            break;
          case 403:
            errorMessage = 'Access denied. You do not have permissions for this resource.';
            break;
          case 404:
            errorMessage = 'Requested API endpoint was not found.';
            break;
          case 409:
            errorMessage = 'Conflict: Duplicate invoice or unique constraint violation.';
            break;
          case 500:
            errorMessage = 'Database or server encountered an internal error.';
            break;
          default:
            errorMessage = error.error?.message || error.statusText || errorMessage;
        }
      }

      notification.error(errorMessage, `HTTP ${error.status || 'Network'}`);
      return throwError(() => error);
    })
  );
};
