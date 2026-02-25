import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { UserRole } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { dashboardRouteForRole } from '../utils/role-routing';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = (route.data['roles'] as UserRole[] | undefined) ?? [];
  const role = authService.currentRole;

  if (role && allowedRoles.includes(role)) {
    return true;
  }

  return router.createUrlTree([dashboardRouteForRole(role)]);
};
