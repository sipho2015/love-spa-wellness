import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DEFAULT_SITE_PROFILE, SiteProfile } from '../../core/models/site-profile.models';
import { InquiryApiService } from '../../core/services/inquiry-api.service';
import { SiteProfileApiService } from '../../core/services/site-profile-api.service';

interface GuideCard {
  title: string;
  country: string;
  imageUrl: string;
}

interface CollectionCard {
  title: string;
  summary: string;
  imageUrl: string;
}

interface DestinationCard {
  name: string;
  imageUrl: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly inquiryApi = inject(InquiryApiService);
  private readonly siteProfileApi = inject(SiteProfileApiService);
  readonly siteProfile = signal<SiteProfile>(DEFAULT_SITE_PROFILE);

  readonly guideCards: GuideCard[] = [
    {
      title: 'Signature Massage Rituals',
      country: 'Victoria Falls',
      imageUrl: '/images/spa-bg-mist.svg'
    },
    {
      title: 'Hydrating Facial Treatments',
      country: 'Love Spa Studio',
      imageUrl: '/images/spa-leaf-frame.svg'
    },
    {
      title: 'Deep Tissue Recovery',
      country: 'Wellness Wing',
      imageUrl: '/images/spa-zen-stones.svg'
    },
    {
      title: 'Couples Relaxation Sessions',
      country: 'Private Suites',
      imageUrl: '/images/spa-bg-mist.svg'
    }
  ];

  readonly collectionCards: CollectionCard[] = [
    {
      title: 'Stress Recovery',
      summary: 'Full-body reset rituals designed to reduce stress and restore calm.',
      imageUrl: '/images/spa-leaf-frame.svg'
    },
    {
      title: 'Skin Renewal',
      summary: 'Targeted facial programs for hydration, radiance, and long-term skin health.',
      imageUrl: '/images/spa-bg-mist.svg'
    },
    {
      title: 'Body Alignment',
      summary: 'Therapeutic massage plans to release tension and improve mobility.',
      imageUrl: '/images/spa-zen-stones.svg'
    },
    {
      title: 'Wellness Membership',
      summary: 'Structured monthly wellness journeys with priority booking and special rates.',
      imageUrl: '/images/spa-bg-mist.svg'
    }
  ];

  readonly destinationCards: DestinationCard[] = [
    {
      name: 'Massage Studio',
      imageUrl: '/images/spa-bg-mist.svg'
    },
    {
      name: 'Facial Lounge',
      imageUrl: '/images/spa-leaf-frame.svg'
    },
    {
      name: 'Recovery Suite',
      imageUrl: '/images/spa-zen-stones.svg'
    }
  ];

  readonly inquiryForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phone: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9()+\-\s]{0,30}$/)]],
    message: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  inquiryLoading = false;
  inquirySuccess = '';
  inquiryError = '';

  constructor() {
    this.loadSiteProfile();
  }

  get cf() {
    return this.inquiryForm.controls;
  }

  get partnerMailto(): string {
    return `mailto:${this.siteProfile().supportEmail}?subject=Partnership%20Inquiry%20-%20Love%20Spa%20%26%20Wellness`;
  }

  get mapEmbedUrl(): string {
    return `https://www.google.com/maps?q=${encodeURIComponent(this.siteProfile().address)}&output=embed`;
  }

  get contactNote(): string {
    return `${this.siteProfile().address} | Daily by appointment`;
  }

  submitInquiry(): void {
    this.inquirySuccess = '';
    this.inquiryError = '';

    if (this.inquiryForm.invalid) {
      this.inquiryForm.markAllAsTouched();
      return;
    }

    const value = this.inquiryForm.getRawValue();
    this.inquiryLoading = true;
    this.inquiryApi
      .create({
        fullName: value.fullName.trim(),
        email: value.email.trim(),
        phone: value.phone.trim() || null,
        message: value.message.trim()
      })
      .subscribe({
        next: () => {
          this.inquiryLoading = false;
          this.inquirySuccess = 'Thank you. Your inquiry has been received.';
          this.inquiryForm.reset({
            fullName: '',
            email: '',
            phone: '',
            message: ''
          });
        },
        error: (error) => {
          this.inquiryLoading = false;
          this.inquiryError = error?.error?.message ?? 'Unable to send inquiry right now. Please try again shortly.';
        }
      });
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

