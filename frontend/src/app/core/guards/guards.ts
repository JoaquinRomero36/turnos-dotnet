import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  inject(Router).navigate(['/login']);
  return false;
};

export const roleGuard = (allowed: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  if (!auth.isAuthenticated()) { inject(Router).navigate(['/login']); return false; }
  if (auth.hasAnyRole(...allowed)) return true;
  inject(Router).navigate(['/dashboard']);
  return false;
};
