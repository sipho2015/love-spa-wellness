import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { dashboardRouteForRole } from '../utils/role-routing';

export const dashboardRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  return inject(Router).createUrlTree([dashboardRouteForRole(authService.currentRole)]);
};
