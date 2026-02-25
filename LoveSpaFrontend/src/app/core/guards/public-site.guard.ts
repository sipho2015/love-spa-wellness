import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { dashboardRouteForRole } from '../utils/role-routing';

export const publicSiteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const role = authService.currentRole;

  if (role === 'Admin' || role === 'Staff') {
    return inject(Router).createUrlTree([dashboardRouteForRole(role)]);
  }

  return true;
};
