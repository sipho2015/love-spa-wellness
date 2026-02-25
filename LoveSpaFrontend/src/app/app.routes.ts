import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { authModalLaunchGuard } from './core/guards/auth-modal-launch.guard';
import { bookingAccessGuard } from './core/guards/booking-access.guard';
import { dashboardRedirectGuard } from './core/guards/dashboard-redirect.guard';
import { guestOnlyGuard } from './core/guards/guest-only.guard';
import { publicSiteGuard } from './core/guards/public-site.guard';
import { roleGuard } from './core/guards/role.guard';
import { AboutPageComponent } from './pages/about/about-page.component';
import { BookingPageComponent } from './pages/booking/booking-page.component';
import { AdminDashboardComponent } from './pages/dashboards/admin-dashboard/admin-dashboard.component';
import { CustomerDashboardComponent } from './pages/dashboards/customer-dashboard/customer-dashboard.component';
import { StaffDashboardComponent } from './pages/dashboards/staff-dashboard/staff-dashboard.component';
import { HomeComponent } from './pages/home/home.component';
import { PrivacyPolicyPageComponent } from './pages/legal/privacy-policy/privacy-policy-page.component';
import { TermsPageComponent } from './pages/legal/terms/terms-page.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';
import { PackagesShowcaseComponent } from './pages/packages-showcase/packages-showcase.component';
import { ServicesPageComponent } from './pages/services/services-page.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, canActivate: [publicSiteGuard], title: 'Love Spa & Wellness' },
  { path: 'about', component: AboutPageComponent, canActivate: [publicSiteGuard], title: 'About | Love Spa & Wellness' },
  {
    path: 'packages',
    component: PackagesShowcaseComponent,
    canActivate: [publicSiteGuard],
    title: 'Packages | Love Spa & Wellness'
  },
  {
    path: 'services',
    component: ServicesPageComponent,
    canActivate: [publicSiteGuard],
    title: 'Services | Love Spa & Wellness'
  },
  {
    path: 'booking',
    component: BookingPageComponent,
    canActivate: [bookingAccessGuard],
    title: 'Book Appointment | Love Spa & Wellness'
  },
  {
    path: 'login',
    component: HomeComponent,
    canActivate: [guestOnlyGuard, authModalLaunchGuard],
    data: { mode: 'login' as const },
    title: 'Login | Love Spa & Wellness'
  },
  {
    path: 'register',
    component: HomeComponent,
    canActivate: [guestOnlyGuard, authModalLaunchGuard],
    data: { mode: 'register' as const },
    title: 'Register | Love Spa & Wellness'
  },
  {
    path: 'dashboard/customer',
    component: CustomerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Customer'] as const },
    title: 'Customer Dashboard | Love Spa & Wellness'
  },
  {
    path: 'dashboard/admin',
    component: AdminDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin'] as const },
    title: 'Admin Dashboard | Love Spa & Wellness'
  },
  {
    path: 'dashboard/staff',
    component: StaffDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Staff'] as const },
    title: 'Staff Dashboard | Love Spa & Wellness'
  },
  { path: 'privacy-policy', component: PrivacyPolicyPageComponent, title: 'Privacy Policy | Love Spa & Wellness' },
  { path: 'terms', component: TermsPageComponent, title: 'Terms of Service | Love Spa & Wellness' },
  { path: 'dashboard', canActivate: [authGuard, dashboardRedirectGuard], component: HomeComponent },
  { path: '**', component: NotFoundComponent, title: 'Not Found | Love Spa & Wellness' }
];
