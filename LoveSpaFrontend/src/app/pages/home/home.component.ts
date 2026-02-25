import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InquiryApiService } from '../../core/services/inquiry-api.service';

interface Testimonial {
  quote: string;
  author: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface ResourceItem {
  title: string;
  description: string;
  readTime: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly inquiryApi = inject(InquiryApiService);

  private testimonialTimer: ReturnType<typeof setInterval> | null = null;

  readonly testimonials: Testimonial[] = [
    {
      quote:
        'The atmosphere is peaceful and professional. Every session leaves me feeling lighter and more balanced.',
      author: 'Rudo'
    },
    {
      quote: 'Booking is effortless, and the therapists truly listen to what your body needs.',
      author: 'Tariro'
    },
    {
      quote:
        'From the first visit, I felt cared for. The deep tissue therapy has helped my recovery immensely.',
      author: 'Blessing'
    }
  ];

  readonly resources: ResourceItem[] = [
    {
      title: 'The Benefits of Hot Stone Massage in Winter',
      description: 'How heat therapy improves circulation, eases tension, and supports cold-season recovery.',
      readTime: '5 min read'
    },
    {
      title: '5 At-Home Relaxation Tips Between Spa Visits',
      description: 'Simple daily practices to reduce stress and keep your body calm between appointments.',
      readTime: '4 min read'
    },
    {
      title: 'How Often Should You Book a Massage?',
      description: 'A practical guide to choosing a treatment schedule based on your lifestyle and goals.',
      readTime: '6 min read'
    }
  ];

  readonly faqs: FaqItem[] = [
    {
      question: 'What should I wear during a massage?',
      answer:
        'Wear comfortable clothing to your appointment. Your therapist will guide you and ensure full draping privacy throughout the session.'
    },
    {
      question: 'Should I tip?',
      answer:
        'Tipping is appreciated but optional. If you feel your service exceeded expectations, you may tip at your discretion.'
    },
    {
      question: "What if I'm running late?",
      answer:
        'Please call us as soon as possible. We will do our best to accommodate you, though treatment time may be adjusted to protect other bookings.'
    },
    {
      question: 'Do you have a couples room?',
      answer:
        'Yes, couples sessions can be arranged in advance. Contact us before booking so we can reserve the right setup.'
    },
    {
      question: 'What is your cancellation policy?',
      answer:
        'Please provide at least 24 hours notice for cancellations or rescheduling. Late cancellations may be subject to a fee.'
    }
  ];

  readonly inquiryForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phone: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9()+\-\s]{0,30}$/)]],
    message: ['', [Validators.required, Validators.maxLength(2000)]]
  });

  activeTestimonialIndex = 0;
  openFaqIndex = 0;
  inquiryLoading = false;
  inquirySuccess = '';
  inquiryError = '';

  ngOnInit(): void {
    this.startTestimonialsRotation();
  }

  ngOnDestroy(): void {
    if (this.testimonialTimer) {
      clearInterval(this.testimonialTimer);
    }
  }

  get cf() {
    return this.inquiryForm.controls;
  }

  prevTestimonial(): void {
    const next = this.activeTestimonialIndex - 1;
    this.activeTestimonialIndex = next < 0 ? this.testimonials.length - 1 : next;
  }

  nextTestimonial(): void {
    this.activeTestimonialIndex = (this.activeTestimonialIndex + 1) % this.testimonials.length;
  }

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? -1 : index;
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

  private startTestimonialsRotation(): void {
    this.testimonialTimer = setInterval(() => {
      this.nextTestimonial();
    }, 5000);
  }
}
