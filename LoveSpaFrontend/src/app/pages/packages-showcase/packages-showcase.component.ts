import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpaPackage } from '../../core/models/package.models';
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

  menuOpen = false;
  headerScrolled = false;
  toastMessage = '';
  loadingPackages = false;
  packagesError = '';
  contactChooserOpen = false;
  readonly year = new Date().getFullYear();
  readonly fallbackPackageImages = [
    'https://cdn.pixabay.com/photo/2019/09/16/17/18/spa-4481538_1280.jpg',
    'https://cdn.pixabay.com/photo/2016/08/11/02/23/massage-therapy-1584711_1280.jpg',
    'https://cdn.pixabay.com/photo/2017/05/30/19/42/skincare-2357980_1280.jpg',
    'https://cdn.pixabay.com/photo/2014/12/13/18/27/woman-567021_1280.jpg',
    'https://cdn.pixabay.com/photo/2023/09/01/20/06/spa-8227623_1280.jpg',
    'https://cdn.pixabay.com/photo/2015/04/20/13/25/massage-731638_1280.jpg'
  ];

  spaPackages: SpaPackage[] = [];

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.headerScrolled = window.scrollY > 8;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeContactChooser();
  }

  ngOnInit(): void {
    this.loadPackages();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onSearch(): void {
    this.showToast('Search experience can be connected to your booking catalog.');
  }

  onSubscribe(emailInput: HTMLInputElement): void {
    const email = emailInput.value.trim();
    if (!email) {
      this.showToast('Please enter your email address.');
      return;
    }

    emailInput.value = '';
    this.showToast('Thank you for subscribing to Love Spa & Wellness updates.');
  }

  openContactChooser(): void {
    this.contactChooserOpen = true;
  }

  closeContactChooser(): void {
    this.contactChooserOpen = false;
  }

  packageImage(item: SpaPackage, index: number): string {
    const candidate = item.imageUrl?.trim();
    if (!candidate || candidate.includes('images.unsplash.com')) {
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
}


