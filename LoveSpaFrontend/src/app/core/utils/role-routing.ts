import { UserRole } from '../models/auth.models';

export function dashboardRouteForRole(role: UserRole | null): string {
  switch (role) {
    case 'Admin':
      return '/dashboard/admin';
    case 'Staff':
      return '/dashboard/staff';
    case 'Customer':
      return '/dashboard/customer';
    default:
      return '/login';
  }
}
