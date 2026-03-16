import { CommonModule, CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { SpaService } from '../../core/models/service.models';
import { SpaServicesApiService } from '../../core/services/spa-services-api.service';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './services-page.component.html',
  styleUrl: './services-page.component.scss'
})
export class ServicesPageComponent implements OnInit {
  private readonly serviceCardImages = [
    '/images/spa-bg-mist.svg',
    '/images/spa-leaf-frame.svg',
    '/images/spa-zen-stones.svg'
  ];

  services: SpaService[] = [];
  loading = false;
  errorMessage = '';

  constructor(private readonly servicesApi: SpaServicesApiService) {}

  ngOnInit(): void {
    this.loadServices();
  }

  cardImage(index: number): string {
    return this.serviceCardImages[index % this.serviceCardImages.length];
  }

  private loadServices(): void {
    this.loading = true;
    this.errorMessage = '';

    this.servicesApi.getAll().subscribe({
      next: (services) => {
        this.services = services.filter((service) => service.isActive);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage =
          error.status === 0
            ? 'Backend API is offline. Start LoveSpaBackend and refresh.'
            : 'Unable to load spa services right now. Please try again shortly.';
        this.loading = false;
      }
    });
  }
}

