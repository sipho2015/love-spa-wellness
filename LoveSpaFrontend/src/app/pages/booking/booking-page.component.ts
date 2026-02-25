import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { CreateAppointmentRequest } from '../../core/models/appointment.models';
import { SpaService } from '../../core/models/service.models';
import { Therapist } from '../../core/models/therapist.models';
import { AppointmentApiService } from '../../core/services/appointment-api.service';
import { AuthService } from '../../core/services/auth.service';
import { SpaServicesApiService } from '../../core/services/spa-services-api.service';
import { TherapistApiService } from '../../core/services/therapist-api.service';

interface BookingSummary {
  serviceName: string;
  therapistName: string;
  appointmentDate: string;
  timeSlot: string;
  customerName: string;
}

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './booking-page.component.html',
  styleUrl: './booking-page.component.scss'
})
export class BookingPageComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly servicesApi = inject(SpaServicesApiService);
  private readonly therapistApi = inject(TherapistApiService);
  private readonly appointmentsApi = inject(AppointmentApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly minDate = new Date().toISOString().slice(0, 10);
  readonly isGuest = !this.authService.isAuthenticated();

  readonly bookingForm = this.formBuilder.nonNullable.group({
    serviceId: [0, [Validators.required, Validators.min(1)]],
    therapistId: [0, [Validators.required, Validators.min(1)]],
    customerName: ['', [Validators.maxLength(120)]],
    customerEmail: ['', [Validators.email, Validators.maxLength(160)]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^[0-9()+\-\s]{7,20}$/)]],
    appointmentDate: ['', [Validators.required]],
    timeSlot: ['', [Validators.required, Validators.maxLength(60)]],
    allergies: ['', [Validators.maxLength(500)]],
    healthConcerns: ['', [Validators.maxLength(1200)]]
  });

  services: SpaService[] = [];
  therapists: Therapist[] = [];
  loading = false;
  submitError = '';
  submitSuccess = '';
  latestBookingSummary: BookingSummary | null = null;
  availableTimeSlots: string[] = [];
  availabilityLoading = false;
  availabilityMessage = 'Select service, therapist, and date to view available slots.';
  private successMessageTimer: ReturnType<typeof setTimeout> | null = null;
  private availabilityRequestVersion = 0;

  ngOnInit(): void {
    this.applyGuestValidationRules();
    this.watchAvailabilityInputs();
    this.loadLookupData();
    this.prefillCustomerName();
  }

  ngOnDestroy(): void {
    this.clearSuccessDismissTimer();
  }

  get f() {
    return this.bookingForm.controls;
  }

  get hasCoreSelection(): boolean {
    return this.f.serviceId.valid && this.f.therapistId.valid;
  }

  get hasContactAndSchedule(): boolean {
    return (
      this.hasCoreSelection &&
      this.f.customerName.valid &&
      this.f.customerEmail.valid &&
      this.f.customerPhone.valid &&
      this.f.appointmentDate.valid &&
      this.f.timeSlot.valid
    );
  }

  get currentStep(): 1 | 2 | 3 {
    if (!this.hasCoreSelection) {
      return 1;
    }

    if (!this.hasContactAndSchedule) {
      return 2;
    }

    return 3;
  }

  get canSubmit(): boolean {
    return (
      this.bookingForm.valid &&
      !this.loading &&
      !this.availabilityLoading &&
      this.availableTimeSlots.length > 0 &&
      this.availableTimeSlots.includes(this.f.timeSlot.value)
    );
  }

  selectTimeSlot(slot: string): void {
    if (!this.availableTimeSlots.includes(slot)) {
      return;
    }

    this.f.timeSlot.setValue(slot);
    this.f.timeSlot.markAsDirty();
    this.f.timeSlot.markAsTouched();
  }

  isTimeSlotSelected(slot: string): boolean {
    return this.f.timeSlot.value === slot;
  }

  submit(): void {
    this.submitError = '';
    this.submitSuccess = '';
    this.latestBookingSummary = null;
    this.clearSuccessDismissTimer();

    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const value = this.bookingForm.getRawValue();
    const normalizedSlot = value.timeSlot.trim();

    if (this.availableTimeSlots.length === 0 || !this.availableTimeSlots.includes(normalizedSlot)) {
      this.submitError = 'Select one of the available time slots.';
      this.f.timeSlot.markAsTouched();
      return;
    }

    const payload: CreateAppointmentRequest = {
      serviceId: Number(value.serviceId),
      therapistId: Number(value.therapistId),
      customerPhone: value.customerPhone.trim(),
      appointmentDate: value.appointmentDate,
      timeSlot: normalizedSlot
    };

    if (value.customerName.trim()) {
      payload.customerName = value.customerName.trim();
    }

    if (value.customerEmail.trim()) {
      payload.customerEmail = value.customerEmail.trim();
    }

    if (value.allergies.trim()) {
      payload.allergies = value.allergies.trim();
    }

    if (value.healthConcerns.trim()) {
      payload.healthConcerns = value.healthConcerns.trim();
    }

    const summary = this.buildSummary({
      serviceId: Number(value.serviceId),
      therapistId: Number(value.therapistId),
      customerName: value.customerName,
      appointmentDate: value.appointmentDate,
      timeSlot: normalizedSlot
    });

    this.loading = true;
    this.appointmentsApi.create(payload).subscribe({
      next: () => {
        this.submitSuccess = 'Appointment request submitted successfully.';
        this.latestBookingSummary = summary;
        this.startSuccessDismissTimer();
        const currentName = this.authService.currentUser?.fullName ?? '';
        const currentEmail = this.authService.currentUser?.email ?? '';
        this.bookingForm.reset({
          serviceId: 0,
          therapistId: 0,
          customerName: currentName,
          customerEmail: currentEmail,
          customerPhone: '',
          appointmentDate: '',
          timeSlot: '',
          allergies: '',
          healthConcerns: ''
        });
        this.availableTimeSlots = [];
        this.availabilityMessage = '';
        this.loading = false;
      },
      error: (error) => {
        this.submitError = error?.error?.message ?? 'Unable to submit booking right now.';
        this.loading = false;
      }
    });
  }

  private prefillCustomerName(): void {
    const fullName = this.authService.currentUser?.fullName;
    if (fullName) {
      this.bookingForm.patchValue({ customerName: fullName });
    }

    const email = this.authService.currentUser?.email;
    if (email) {
      this.bookingForm.patchValue({ customerEmail: email });
    }
  }

  private applyGuestValidationRules(): void {
    if (!this.isGuest) {
      return;
    }

    this.bookingForm.controls.customerName.addValidators([Validators.required]);
    this.bookingForm.controls.customerName.updateValueAndValidity({ emitEvent: false });
    this.bookingForm.controls.customerEmail.addValidators([Validators.required]);
    this.bookingForm.controls.customerEmail.updateValueAndValidity({ emitEvent: false });
  }

  private watchAvailabilityInputs(): void {
    this.f.serviceId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshAvailableSlots();
    });

    this.f.therapistId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshAvailableSlots();
    });

    this.f.appointmentDate.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.refreshAvailableSlots();
    });
  }

  private refreshAvailableSlots(): void {
    const serviceId = Number(this.f.serviceId.value);
    const therapistId = Number(this.f.therapistId.value);
    const appointmentDate = this.f.appointmentDate.value;

    if (serviceId <= 0 || therapistId <= 0 || !appointmentDate) {
      this.availableTimeSlots = [];
      this.availabilityMessage = 'Select service, therapist, and date to view available slots.';
      this.availabilityLoading = false;
      this.f.timeSlot.setValue('');
      return;
    }

    const service = this.services.find((value) => value.id === serviceId);
    if (!service) {
      this.availableTimeSlots = [];
      this.availabilityMessage = 'Selected service is not available.';
      this.availabilityLoading = false;
      this.f.timeSlot.setValue('');
      return;
    }

    this.availabilityLoading = true;
    this.availabilityMessage = '';

    const requestVersion = ++this.availabilityRequestVersion;
    this.appointmentsApi
      .getAvailability({
        therapistId,
        appointmentDate,
        durationMinutes: service.durationMinutes
      })
      .subscribe({
        next: (response) => {
          if (requestVersion !== this.availabilityRequestVersion) {
            return;
          }

          this.availableTimeSlots = response.availableSlots ?? [];
          this.availabilityLoading = false;
          this.availabilityMessage =
            response.message ??
            (this.availableTimeSlots.length === 0 ? 'No available slots for the selected date.' : '');

          if (!this.availableTimeSlots.includes(this.f.timeSlot.value)) {
            this.f.timeSlot.setValue('');
          }
        },
        error: (error: HttpErrorResponse) => {
          if (requestVersion !== this.availabilityRequestVersion) {
            return;
          }

          this.availableTimeSlots = [];
          this.availabilityLoading = false;
          this.availabilityMessage =
            error.status === 0
              ? 'Backend API is offline. Start LoveSpaBackend and refresh.'
              : error.error?.message ?? 'Could not load availability right now.';
          this.f.timeSlot.setValue('');
        }
      });
  }

  private loadLookupData(): void {
    forkJoin({
      services: this.servicesApi.getAll(),
      therapists: this.therapistApi.getAll(true)
    }).subscribe({
      next: ({ services, therapists }) => {
        this.services = services.filter((service) => service.isActive);
        this.therapists = therapists;
        this.refreshAvailableSlots();
      },
      error: (error: HttpErrorResponse) => {
        this.submitError =
          error.status === 0
            ? 'Backend API is offline. Start LoveSpaBackend and refresh.'
            : 'Unable to load services and therapists. Refresh and try again.';
      }
    });
  }

  private startSuccessDismissTimer(): void {
    this.clearSuccessDismissTimer();
    this.successMessageTimer = setTimeout(() => {
      this.submitSuccess = '';
      this.successMessageTimer = null;
    }, 3500);
  }

  private clearSuccessDismissTimer(): void {
    if (!this.successMessageTimer) {
      return;
    }

    clearTimeout(this.successMessageTimer);
    this.successMessageTimer = null;
  }

  private buildSummary(value: {
    serviceId: number;
    therapistId: number;
    customerName: string;
    appointmentDate: string;
    timeSlot: string;
  }): BookingSummary {
    const serviceName = this.services.find((service) => service.id === value.serviceId)?.name ?? 'Selected service';
    const therapistName =
      this.therapists.find((therapist) => therapist.id === value.therapistId)?.name ?? 'Selected therapist';
    const customerName = value.customerName.trim() || this.authService.currentUser?.fullName || 'Guest';

    return {
      serviceName,
      therapistName,
      customerName,
      appointmentDate: value.appointmentDate,
      timeSlot: value.timeSlot
    };
  }
}
