import { AsyncPipe, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './core/services/auth.service';
import { AppNotification } from './core/models/notification.models';
import { UserRole } from './core/models/auth.models';
import { dashboardRouteForRole } from './core/utils/role-routing';
import { AuthModalService } from './core/services/auth-modal.service';
import { AuthModalComponent } from './shared/auth-modal/auth-modal.component';
import { NotificationApiService } from './core/services/notification-api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe, AuthModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private static readonly THEME_STORAGE_KEY = 'love-spa-theme';
  private readonly notificationRefreshMs = 25000;

  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly notificationApi = inject(NotificationApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private notificationTimer: ReturnType<typeof setInterval> | null = null;

  readonly user$ = this.authService.user$;
  readonly currentRoute = signal(this.router.url);
  readonly year = new Date().getFullYear();
  readonly adminMenuOpen = signal(false);
  readonly darkTheme = signal(false);
  readonly mobileMenuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly notifications = signal<AppNotification[]>([]);
  readonly unreadNotificationCount = signal(0);
  readonly notificationsLoading = signal(false);
  readonly notificationsError = signal('');

  constructor() {
    this.restoreThemePreference();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.currentRoute.set(event.urlAfterRedirects);
        this.closeAdminMenu();
        this.closeMobileMenu();
        this.closeNotifications();
      });

    this.authService.authState$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((session) => {
      if (!session) {
        this.stopNotificationPolling();
        this.notifications.set([]);
        this.unreadNotificationCount.set(0);
        this.notificationsLoading.set(false);
        this.notificationsError.set('');
        this.closeNotifications();
        return;
      }

      this.fetchUnreadNotificationCount();
      this.fetchNotifications(false);
      this.startNotificationPolling();
      });
  }

  get dashboardLink(): string {
    return dashboardRouteForRole(this.authService.currentRole);
  }

  get brandLink(): string {
    return this.isBackOfficeRole() ? this.dashboardLink : '/';
  }

  hasRole(role: UserRole): boolean {
    return this.authService.currentRole === role;
  }

  isBackOfficeRole(): boolean {
    const role = this.authService.currentRole;
    return role === 'Admin' || role === 'Staff';
  }

  showPublicNavigation(): boolean {
    return !this.isBackOfficeRole();
  }

  canSeeBooking(): boolean {
    const role = this.authService.currentRole;
    return role === null || role === 'Customer';
  }

  canUseNotifications(): boolean {
    return this.authService.isAuthenticated();
  }

  get unreadNotificationLabel(): string {
    const count = this.unreadNotificationCount();
    return count > 99 ? '99+' : `${count}`;
  }

  showSiteFooter(): boolean {
    return !this.isPackagesShowcaseRoute() && this.showPublicNavigation();
  }

  isPackagesShowcaseRoute(): boolean {
    return this.currentRoute().startsWith('/packages');
  }

  logout(): void {
    this.closeAdminMenu();
    this.closeNotifications();
    this.authService.logout();
    void this.router.navigateByUrl('/');
  }

  openLoginModal(): void {
    this.authModalService.open('login');
  }

  openRegisterModal(): void {
    this.authModalService.open('register');
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeAdminMenu();
    this.closeMobileMenu();
    this.closeNotifications();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (window.innerWidth > 820 && this.mobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }

  toggleAdminMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.closeMobileMenu();
    this.closeNotifications();
    this.adminMenuOpen.update((isOpen) => !isOpen);
  }

  closeAdminMenu(): void {
    this.adminMenuOpen.set(false);
  }

  toggleMobileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.closeAdminMenu();
    this.closeNotifications();
    this.mobileMenuOpen.update((isOpen) => !isOpen);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();

    if (!this.canUseNotifications()) {
      return;
    }

    this.closeAdminMenu();
    const nextState = !this.notificationsOpen();
    this.notificationsOpen.set(nextState);

    if (nextState) {
      this.fetchNotifications(true);
      this.fetchUnreadNotificationCount();
    }
  }

  closeNotifications(): void {
    this.notificationsOpen.set(false);
  }

  markNotificationRead(notification: AppNotification): void {
    if (notification.isRead) {
      return;
    }

    this.notificationApi.markRead(notification.id).subscribe({
      next: (updated) => {
        this.notifications.update((items) =>
          items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
        );
        this.unreadNotificationCount.update((count) => Math.max(0, count - 1));
      },
      error: () => {
        this.notificationsError.set('Could not mark notification as read.');
      }
    });
  }

  markAllNotificationsRead(): void {
    this.notificationApi.markAllRead().subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((item) =>
            item.isRead
              ? item
              : {
                  ...item,
                  isRead: true,
                  readAtUtc: new Date().toISOString()
                }
          )
        );
        this.unreadNotificationCount.set(0);
      },
      error: () => {
        this.notificationsError.set('Could not mark all notifications as read.');
      }
    });
  }

  toggleTheme(): void {
    this.setTheme(!this.darkTheme());
    this.closeAdminMenu();
    this.closeMobileMenu();
    this.closeNotifications();
  }

  setTheme(useDark: boolean): void {
    this.applyTheme(useDark);

    try {
      localStorage.setItem(App.THEME_STORAGE_KEY, useDark ? 'dark' : 'light');
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  }

  logoutFromMenu(): void {
    this.logout();
  }

  private startNotificationPolling(): void {
    this.stopNotificationPolling();
    this.notificationTimer = setInterval(() => {
      this.fetchUnreadNotificationCount();
      if (this.notificationsOpen()) {
        this.fetchNotifications(false);
      }
    }, this.notificationRefreshMs);
  }

  private stopNotificationPolling(): void {
    if (!this.notificationTimer) {
      return;
    }

    clearInterval(this.notificationTimer);
    this.notificationTimer = null;
  }

  private fetchNotifications(showLoading: boolean): void {
    if (!this.canUseNotifications()) {
      return;
    }

    if (showLoading) {
      this.notificationsLoading.set(true);
    }

    this.notificationApi.getMy(false, 50).subscribe({
      next: (items) => {
        this.notifications.set(items);
        this.notificationsError.set('');
        if (showLoading) {
          this.notificationsLoading.set(false);
        }
      },
      error: (error) => {
        if (showLoading) {
          this.notificationsLoading.set(false);
        }

        if (showLoading || this.notificationsOpen()) {
          this.notificationsError.set(
            error?.status === 0
              ? 'Backend API is offline. Start LoveSpaBackend and try again.'
              : 'Could not load notifications.'
          );
        }
      }
    });
  }

  private fetchUnreadNotificationCount(): void {
    if (!this.canUseNotifications()) {
      return;
    }

    this.notificationApi.getUnreadCount().subscribe({
      next: (response) => {
        this.unreadNotificationCount.set(Math.max(0, response.count));
      },
      error: () => {
        // Ignore polling errors here; full errors are handled in drawer fetch.
      }
    });
  }

  private restoreThemePreference(): void {
    try {
      const savedTheme = localStorage.getItem(App.THEME_STORAGE_KEY);
      this.applyTheme(savedTheme === 'dark');
    } catch {
      this.applyTheme(false);
    }
  }

  private applyTheme(useDark: boolean): void {
    this.darkTheme.set(useDark);
    this.document.body.classList.toggle('theme-dark', useDark);
  }
}
