import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../auth/auth.state';
import { NotificationService } from '../services/notification.service';

export const roleGuard = (requiredPermission: string): CanActivateFn => {
  return () => {
    const authState = inject(AuthState);
    const router = inject(Router);
    const notification = inject(NotificationService);

    if (authState.hasPermission(requiredPermission)) {
      return true;
    }

    notification.error('Your assigned role does not have authorization for this action.', 'Access Denied');
    router.navigate(['/pos']);
    return false;
  };
};
