import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthModalMode, AuthModalService } from '../services/auth-modal.service';

export const authModalLaunchGuard: CanActivateFn = (route) => {
  const mode = (route.data?.['mode'] as AuthModalMode | undefined) ?? 'login';
  inject(AuthModalService).open(mode);
  return inject(Router).createUrlTree(['/']);
};
