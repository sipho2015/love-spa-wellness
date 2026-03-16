import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_SITE_PROFILE, SiteProfile } from '../../core/models/site-profile.models';
import { SpaPackage } from '../../core/models/package.models';
import { InquiryApiService } from '../../core/services/inquiry-api.service';
import { SiteProfileApiService } from '../../core/services/site-profile-api.service';
import { SpaPackagesApiService } from '../../core/services/spa-packages-api.service';

@Component({
  selector: 'app-packages-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './packages-showcase.component.html',
  styleUrl: './packages-showcase.component.scss'
})
export class PackagesShowcaseComponent implements OnInit {
  private readonly packagesApi = inject(SpaPackagesApiService);
  private readonly inquiryApi = inject(InquiryApiService);
  private readonly siteProfileApi = inject(SiteProfileApiService);

  menuOpen = false;
  headerScrolled = false;
  toastMessage = '';
  loadingPackages = false;
  packagesError = '';
  readonly year = new Date().getFullYear();
  readonly fallbackPackageImages = [
    '/images/spa-bg-mist.svg',
    '/images/spa-leaf-frame.svg',
    '/images/spa-zen-stones.svg'
  ];
  readonly siteProfile = signal<SiteProfile>(DEFAULT_SITE_PROFILE);

  spaPackages: SpaPackage[] = [];

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.headerScrolled = window.scrollY > 8;
  }

  ngOnInit(): void {
    this.loadPackages();
    this.loadSiteProfile();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onSubscribe(emailInput: HTMLInputElement): void {
    const email = emailInput.value.trim();
    if (!email) {
      this.showToast('Please enter your email address.');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showToast('Please enter a valid email address.');
      return;
    }

    this.inquiryApi
      .create({
        fullName: 'Website Newsletter Subscriber',
        email,
        phone: null,
        message: 'Please subscribe this email to Love Spa & Wellness updates.'
      })
      .subscribe({
        next: () => {
          emailInput.value = '';
          this.showToast('Subscription request sent. We will keep you updated.');
        },
        error: () => {
          this.showToast('Unable to submit right now. Please try again shortly.');
        }
      });
  }

  packageImage(item: SpaPackage, index: number): string {
    const candidate = item.imageUrl?.trim();
    if (!candidate) {
      return this.fallbackPackageImages[index % this.fallbackPackageImages.length];
    }

    return candidate;
  }

  promoPackages(): SpaPackage[] {
    return this.spaPackages.slice(0, 2);
  }

  discountPercent(item: SpaPackage): number {
    if (item.originalPrice <= 0 || item.savingsAmount <= 0) {
      return 0;
    }

    return Math.round((item.savingsAmount / item.originalPrice) * 100);
  }

  get mailtoSupport(): string {
    return `mailto:${this.siteProfile().supportEmail}`;
  }

  get telSupport(): string {
    return `tel:${this.siteProfile().phoneDial}`;
  }

  private loadPackages(): void {
    this.loadingPackages = true;
    this.packagesError = '';

    this.packagesApi.getAll(true).subscribe({
      next: (packages) => {
        this.spaPackages = packages;
        this.loadingPackages = false;
      },
      error: (error: HttpErrorResponse) => {
        this.packagesError =
          error.status === 0
            ? 'Backend API is offline. Start LoveSpaBackend and refresh.'
            : 'Unable to load packages right now. Please refresh and try again.';
        this.loadingPackages = false;
      }
    });
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    setTimeout(() => {
      this.toastMessage = '';
    }, 2600);
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private loadSiteProfile(): void {
    this.siteProfileApi.get().subscribe({
      next: (profile) => {
        this.siteProfile.set(profile);
      },
      error: () => {
        // Keep defaults when backend profile endpoint is unavailable.
      }
    });
  }
}
