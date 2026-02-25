import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { dashboardRouteForRole } from '../utils/role-routing';

export const guestOnlyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return inject(Router).createUrlTree([dashboardRouteForRole(authService.currentRole)]);
};
