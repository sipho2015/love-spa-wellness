import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InquiryApiService } from '../../core/services/inquiry-api.service';

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

  readonly guideCards: GuideCard[] = [
    {
      title: 'Cliffside Thermal Suites',
      country: 'Portugal',
      imageUrl:
        'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1400&q=80'
    },
    {
      title: 'Rainforest Hydro Journey',
      country: 'Costa Rica',
      imageUrl:
        'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1400&q=80'
    },
    {
      title: 'Nordic Silence Rituals',
      country: 'Finland',
      imageUrl:
        'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1400&q=80'
    },
    {
      title: 'Island Reset Pavilion',
      country: 'Maldives',
      imageUrl:
        'https://cdn.pixabay.com/photo/2019/09/16/17/18/spa-4481538_1280.jpg'
    }
  ];

  readonly collectionCards: CollectionCard[] = [
    {
      title: 'Spa & Sea',
      summary: 'Oceanfront sanctuaries with hydrotherapy circuits and coastal bodywork.',
      imageUrl:
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'Spa & Mountains',
      summary: 'High-altitude retreats focused on sleep recovery and thermal contrast.',
      imageUrl:
        'https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'Urban Detox',
      summary: 'Design-led city escapes with precision treatments and mindful pacing.',
      imageUrl:
        'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1200&q=80'
    },
    {
      title: 'Wild Reset',
      summary: 'Nature-first journeys with breathing rituals, forest walks, and recovery cuisine.',
      imageUrl:
        'https://cdn.pixabay.com/photo/2017/08/08/00/17/spa-2608450_1280.jpg'
    }
  ];

  readonly destinationCards: DestinationCard[] = [
    {
      name: 'The Maldives',
      imageUrl:
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80'
    },
    {
      name: 'Bali',
      imageUrl:
        'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80'
    },
    {
      name: 'Swiss Alps',
      imageUrl:
        'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80'
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

  get cf() {
    return this.inquiryForm.controls;
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
}
