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
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1556229162-5c63ed9c4efb?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80'
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
