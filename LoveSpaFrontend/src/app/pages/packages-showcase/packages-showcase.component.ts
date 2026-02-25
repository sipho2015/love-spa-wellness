import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpaPackage } from '../../core/models/package.models';
import { SpaPackagesApiService } from '../../core/services/spa-packages-api.service';

interface PromoBanner {
  heading: string;
  imageUrl: string;
}

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
  readonly year = new Date().getFullYear();
  readonly fallbackPackageImages = [
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1556229162-5c63ed9c4efb?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=900&q=80'
  ];

  spaPackages: SpaPackage[] = [];

  readonly promos: PromoBanner[] = [
    {
      heading: 'Relax & Restore Package',
      imageUrl:
        'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1200&q=80'
    },
    {
      heading: 'Glow & Renewal Ritual',
      imageUrl:
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80'
    }
  ];

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.headerScrolled = window.scrollY > 8;
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

  packageImage(item: SpaPackage, index: number): string {
    return item.imageUrl?.trim() || this.fallbackPackageImages[index % this.fallbackPackageImages.length];
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
