import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, catchError, forkJoin, of, throwError } from 'rxjs';
import { Appointment, AppointmentStatus, UpdateAppointmentRequest } from '../../../core/models/appointment.models';
import { SavePackageRequest, SpaPackage } from '../../../core/models/package.models';
import { UserProfile } from '../../../core/models/auth.models';
import { Inquiry, InquiryStatus, ReplyToInquiryRequest } from '../../../core/models/inquiry.models';
import { SaveServiceRequest, SpaService } from '../../../core/models/service.models';
import { SaveTherapistRequest, Therapist } from '../../../core/models/therapist.models';
import { AppointmentApiService } from '../../../core/services/appointment-api.service';
import { InquiryApiService } from '../../../core/services/inquiry-api.service';
import { SpaPackagesApiService } from '../../../core/services/spa-packages-api.service';
import { SpaServicesApiService } from '../../../core/services/spa-services-api.service';
import { TherapistApiService } from '../../../core/services/therapist-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserApiService } from '../../../core/services/user-api.service';

type AdminSection = 'overview' | 'bookings' | 'inquiries' | 'services' | 'therapists' | 'packages' | 'users';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly servicesApi = inject(SpaServicesApiService);
  private readonly packagesApi = inject(SpaPackagesApiService);
  private readonly therapistApi = inject(TherapistApiService);
  private readonly userApi = inject(UserApiService);
  private readonly appointmentsApi = inject(AppointmentApiService);
  private readonly inquiryApi = inject(InquiryApiService);
  private readonly authService = inject(AuthService);

  private readonly refreshIntervalMs = 30000;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private notificationsInitialized = false;

  services: SpaService[] = [];
  packages: SpaPackage[] = [];
  therapists: Therapist[] = [];
  users: UserProfile[] = [];
  appointments: Appointment[] = [];
  inquiries: Inquiry[] = [];

  readonly bookingStatuses: AppointmentStatus[] = [
    'Pending',
    'Confirmed',
    'Pending Approval',
    'Completed',
    'Cancelled'
  ];
  readonly bookingDrafts: Record<number, { therapistId: number; status: AppointmentStatus }> = {};

  serviceEditingId: number | null = null;
  packageEditingId: number | null = null;
  therapistEditingId: number | null = null;
  updatingBookingId: number | null = null;
  updatingInquiryId: number | null = null;
  replyingInquiryId: number | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';
  adminNotice = '';
  loadWarnings: string[] = [];
  activeSection: AdminSection = 'overview';

  readonly serviceForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(800)]],
    durationMinutes: [60, [Validators.required, Validators.min(15), Validators.max(480)]],
    price: [89, [Validators.required, Validators.min(1)]],
    isActive: [true]
  });

  readonly therapistForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    specialty: ['', [Validators.required, Validators.maxLength(250)]],
    isAvailable: [true],
    userId: [0]
  });

  readonly packageForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(800)]],
    durationMinutes: [120, [Validators.required, Validators.min(30), Validators.max(600)]],
    originalPrice: [199, [Validators.required, Validators.min(1)]],
    packagePrice: [169, [Validators.required, Validators.min(1)]],
    imageUrl: ['', [Validators.maxLength(500)]],
    isActive: [true],
    serviceIds: [[] as number[]]
  });

  readonly inquiryReplyForm = this.formBuilder.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.maxLength(4000)]],
    adminNotes: ['', [Validators.maxLength(1200)]],
    markAsHandled: [true]
  });

  ngOnInit(): void {
    this.loadDashboardData(true, true);
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.clearNoticeTimer();
  }

  get sf() {
    return this.serviceForm.controls;
  }

  get tf() {
    return this.therapistForm.controls;
  }

  get pf() {
    return this.packageForm.controls;
  }

  get pendingBookingsCount(): number {
    return this.appointments.filter((appointment) => appointment.status === 'Pending').length;
  }

  get pendingInquiriesCount(): number {
    return this.inquiries.filter((inquiry) => inquiry.status === 'Pending').length;
  }

  get staffUsers(): UserProfile[] {
    return this.users.filter((user) => user.role === 'Staff');
  }

  get rf() {
    return this.inquiryReplyForm.controls;
  }

  get replyingInquiry(): Inquiry | null {
    if (!this.replyingInquiryId) {
      return null;
    }

    return this.inquiries.find((inquiry) => inquiry.id === this.replyingInquiryId) ?? null;
  }

  refresh(): void {
    this.loadDashboardData(true, true);
  }

  setActiveSection(section: AdminSection): void {
    this.activeSection = section;
  }

  isActiveSection(section: AdminSection): boolean {
    return this.activeSection === section;
  }

  openMailReply(inquiry: Inquiry): void {
    const subject = `Re: Love Spa inquiry (${inquiry.fullName})`;
    const body =
      `Hi ${this.firstName(inquiry.fullName)},` +
      `\n\nThank you for contacting Love Spa & Wellness.` +
      `\n\n` +
      `Best regards,\nLove Spa & Wellness`;

    const mailto = `mailto:${encodeURIComponent(inquiry.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank', 'noopener');
  }

  setInquiryStatus(inquiry: Inquiry, status: InquiryStatus): void {
    if (inquiry.status === status || this.updatingInquiryId === inquiry.id) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.updatingInquiryId = inquiry.id;

    this.inquiryApi
      .updateStatus(inquiry.id, {
        status,
        adminNotes: inquiry.adminNotes ?? null
      })
      .subscribe({
        next: (updated) => {
          this.inquiries = this.inquiries.map((item) => (item.id === inquiry.id ? updated : item));
          this.updatingInquiryId = null;
          this.successMessage = `Inquiry #${inquiry.id} marked as ${status}.`;
        },
        error: (error) => {
          this.updatingInquiryId = null;
          this.errorMessage = error?.error?.message ?? 'Could not update inquiry status.';
        }
      });
  }

  startReply(inquiry: Inquiry): void {
    this.replyingInquiryId = inquiry.id;

    const defaultSubject = `Re: Your inquiry to Love Spa & Wellness`;
    const defaultBody =
      `Hi ${this.firstName(inquiry.fullName)},` +
      `\n\nThank you for contacting Love Spa & Wellness.` +
      `\n\nWe have received your message and would be happy to help.` +
      `\n\nBest regards,\nLove Spa & Wellness`;

    this.inquiryReplyForm.reset({
      subject: inquiry.lastReplySubject ?? defaultSubject,
      body: defaultBody,
      adminNotes: inquiry.adminNotes ?? '',
      markAsHandled: true
    });
  }

  cancelReply(): void {
    this.replyingInquiryId = null;
    this.inquiryReplyForm.reset({
      subject: '',
      body: '',
      adminNotes: '',
      markAsHandled: true
    });
  }

  sendReply(): void {
    const inquiry = this.replyingInquiry;
    if (!inquiry) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (this.inquiryReplyForm.invalid) {
      this.inquiryReplyForm.markAllAsTouched();
      return;
    }

    const value = this.inquiryReplyForm.getRawValue();
    const payload: ReplyToInquiryRequest = {
      subject: value.subject.trim(),
      body: value.body.trim(),
      adminNotes: value.adminNotes.trim() || null,
      markAsHandled: value.markAsHandled
    };

    this.updatingInquiryId = inquiry.id;
    this.inquiryApi.reply(inquiry.id, payload).subscribe({
      next: (updated) => {
        this.inquiries = this.inquiries.map((item) => (item.id === inquiry.id ? updated : item));
        this.updatingInquiryId = null;
        this.successMessage = `Reply sent to ${inquiry.email}.`;
        this.cancelReply();
      },
      error: (error) => {
        this.updatingInquiryId = null;
        this.errorMessage = error?.error?.message ?? 'Could not send inquiry reply.';
      }
    });
  }

  bookingTherapistValue(appointment: Appointment): number {
    return this.bookingDrafts[appointment.id]?.therapistId ?? appointment.therapistId;
  }

  bookingStatusValue(appointment: Appointment): AppointmentStatus {
    return this.bookingDrafts[appointment.id]?.status ?? appointment.status;
  }

  onBookingTherapistChange(appointmentId: number, rawTherapistId: string): void {
    const therapistId = Number(rawTherapistId);
    const existing = this.bookingDrafts[appointmentId];
    const fallbackStatus = this.appointments.find((appointment) => appointment.id === appointmentId)?.status ?? 'Pending';

    if (!Number.isFinite(therapistId) || therapistId <= 0) {
      return;
    }

    this.bookingDrafts[appointmentId] = {
      therapistId,
      status: existing?.status ?? fallbackStatus
    };
  }

  onBookingStatusChange(appointmentId: number, rawStatus: string): void {
    const status = rawStatus as AppointmentStatus;
    const existing = this.bookingDrafts[appointmentId];
    const fallbackTherapistId =
      this.appointments.find((appointment) => appointment.id === appointmentId)?.therapistId ?? 0;

    if (!this.bookingStatuses.includes(status)) {
      return;
    }

    this.bookingDrafts[appointmentId] = {
      therapistId: existing?.therapistId ?? fallbackTherapistId,
      status
    };
  }

  saveBookingChanges(appointment: Appointment): void {
    this.errorMessage = '';
    this.successMessage = '';

    const draft = this.bookingDrafts[appointment.id];
    const payload: UpdateAppointmentRequest = {
      serviceId: appointment.serviceId,
      therapistId: draft?.therapistId ?? appointment.therapistId,
      customerName: appointment.customerName,
      customerEmail: appointment.customerEmail ?? undefined,
      customerPhone: appointment.customerPhone,
      appointmentDate: appointment.appointmentDate,
      timeSlot: appointment.timeSlot,
      allergies: appointment.allergies ?? undefined,
      healthConcerns: appointment.healthConcerns ?? undefined,
      paymentReference: appointment.paymentReference ?? undefined,
      status: draft?.status ?? appointment.status
    };

    this.updatingBookingId = appointment.id;
    this.appointmentsApi.update(appointment.id, payload).subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((item) => (item.id === appointment.id ? updated : item));
        this.bookingDrafts[appointment.id] = {
          therapistId: updated.therapistId,
          status: updated.status
        };
        this.updatingBookingId = null;
        this.successMessage = `Booking #${appointment.id} updated successfully.`;
      },
      error: () => {
        this.updatingBookingId = null;
        this.errorMessage = 'Could not update booking assignment.';
      }
    });
  }

  verifyDeposit(appointment: Appointment): void {
    if (this.updatingBookingId === appointment.id || appointment.depositStatus === 'Verified') {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.updatingBookingId = appointment.id;

    this.appointmentsApi
      .verifyDeposit(appointment.id, {
        paymentReference: appointment.paymentReference ?? undefined,
        markBookingConfirmed: true
      })
      .subscribe({
        next: (updated) => {
          this.appointments = this.appointments.map((item) => (item.id === appointment.id ? updated : item));
          this.bookingDrafts[appointment.id] = {
            therapistId: updated.therapistId,
            status: updated.status
          };
          this.updatingBookingId = null;
          this.successMessage = `Deposit verified for booking #${appointment.id}.`;
        },
        error: (error) => {
          this.updatingBookingId = null;
          this.errorMessage = error?.error?.message ?? 'Could not verify deposit.';
        }
      });
  }

  saveService(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    const value = this.serviceForm.getRawValue();
    const payload: SaveServiceRequest = {
      name: value.name.trim(),
      description: value.description.trim(),
      durationMinutes: Number(value.durationMinutes),
      price: Number(value.price),
      isActive: value.isActive
    };

    const request$ = this.serviceEditingId
      ? this.servicesApi.update(this.serviceEditingId, payload)
      : this.servicesApi.create(payload);

    request$.subscribe({
      next: () => {
        this.successMessage = this.serviceEditingId ? 'Service updated successfully.' : 'Service added successfully.';
        this.cancelServiceEdit();
        this.loadDashboardData();
      },
      error: () => {
        this.errorMessage = 'Could not save service details.';
      }
    });
  }

  editService(service: SpaService): void {
    this.serviceEditingId = service.id;
    this.serviceForm.patchValue({
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: service.isActive
    });
  }

  deleteService(service: SpaService): void {
    if (!window.confirm(`Delete service "${service.name}"?`)) {
      return;
    }

    this.servicesApi.delete(service.id).subscribe({
      next: () => {
        this.successMessage = 'Service deleted.';
        this.loadDashboardData();
      },
      error: () => {
        this.errorMessage = 'Could not delete the service.';
      }
    });
  }

  cancelServiceEdit(): void {
    this.serviceEditingId = null;
    this.serviceForm.reset({
      name: '',
      description: '',
      durationMinutes: 60,
      price: 89,
      isActive: true
    });
  }

  savePackage(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.packageForm.invalid) {
      this.packageForm.markAllAsTouched();
      return;
    }

    const value = this.packageForm.getRawValue();
    const serviceIds = Array.from(new Set(value.serviceIds.filter((id) => id > 0)));

    if (serviceIds.length === 0) {
      this.errorMessage = 'Please select at least one service for the package.';
      return;
    }

    if (Number(value.packagePrice) > Number(value.originalPrice)) {
      this.errorMessage = 'Package price cannot be greater than original price.';
      return;
    }

    const payload: SavePackageRequest = {
      name: value.name.trim(),
      description: value.description.trim(),
      durationMinutes: Number(value.durationMinutes),
      originalPrice: Number(value.originalPrice),
      packagePrice: Number(value.packagePrice),
      imageUrl: value.imageUrl.trim() || null,
      isActive: value.isActive,
      serviceIds
    };

    const request$ = this.packageEditingId
      ? this.packagesApi.update(this.packageEditingId, payload)
      : this.packagesApi.create(payload);

    request$.subscribe({
      next: () => {
        this.successMessage = this.packageEditingId ? 'Package updated successfully.' : 'Package added successfully.';
        this.cancelPackageEdit();
        this.loadDashboardData();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Could not save package details.';
      }
    });
  }

  editPackage(spaPackage: SpaPackage): void {
    this.packageEditingId = spaPackage.id;
    this.packageForm.patchValue({
      name: spaPackage.name,
      description: spaPackage.description,
      durationMinutes: spaPackage.durationMinutes,
      originalPrice: spaPackage.originalPrice,
      packagePrice: spaPackage.packagePrice,
      imageUrl: spaPackage.imageUrl ?? '',
      isActive: spaPackage.isActive,
      serviceIds: spaPackage.includedServices.map((service) => service.id)
    });
  }

  deletePackage(spaPackage: SpaPackage): void {
    if (!window.confirm(`Delete package "${spaPackage.name}"?`)) {
      return;
    }

    this.packagesApi.delete(spaPackage.id).subscribe({
      next: () => {
        this.successMessage = 'Package deleted.';
        this.loadDashboardData();
      },
      error: () => {
        this.errorMessage = 'Could not delete package.';
      }
    });
  }

  cancelPackageEdit(): void {
    this.packageEditingId = null;
    this.packageForm.reset({
      name: '',
      description: '',
      durationMinutes: 120,
      originalPrice: 199,
      packagePrice: 169,
      imageUrl: '',
      isActive: true,
      serviceIds: []
    });
  }

  togglePackageService(serviceId: number, checked: boolean): void {
    const current = this.packageForm.controls.serviceIds.value;
    const next = checked ? [...current, serviceId] : current.filter((id) => id !== serviceId);
    this.packageForm.controls.serviceIds.setValue(Array.from(new Set(next)));
    this.packageForm.controls.serviceIds.markAsDirty();
  }

  isServiceSelected(serviceId: number): boolean {
    return this.packageForm.controls.serviceIds.value.includes(serviceId);
  }

  saveTherapist(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.therapistForm.invalid) {
      this.therapistForm.markAllAsTouched();
      return;
    }

    const value = this.therapistForm.getRawValue();
    const payload: SaveTherapistRequest = {
      name: value.name.trim(),
      specialty: value.specialty.trim(),
      isAvailable: value.isAvailable,
      userId: value.userId > 0 ? value.userId : null
    };

    const request$ = this.therapistEditingId
      ? this.therapistApi.update(this.therapistEditingId, payload)
      : this.therapistApi.create(payload);

    request$.subscribe({
      next: () => {
        this.successMessage = this.therapistEditingId
          ? 'Therapist updated successfully.'
          : 'Therapist added successfully.';
        this.cancelTherapistEdit();
        this.loadDashboardData();
      },
      error: () => {
        this.errorMessage = 'Could not save therapist details.';
      }
    });
  }

  editTherapist(therapist: Therapist): void {
    this.therapistEditingId = therapist.id;
    this.therapistForm.patchValue({
      name: therapist.name,
      specialty: therapist.specialty,
      isAvailable: therapist.isAvailable,
      userId: therapist.userId ?? 0
    });
  }

  deleteTherapist(therapist: Therapist): void {
    if (!window.confirm(`Delete therapist "${therapist.name}"?`)) {
      return;
    }

    this.therapistApi.delete(therapist.id).subscribe({
      next: () => {
        this.successMessage = 'Therapist deleted.';
        this.loadDashboardData();
      },
      error: () => {
        this.errorMessage = 'Could not delete therapist.';
      }
    });
  }

  cancelTherapistEdit(): void {
    this.therapistEditingId = null;
    this.therapistForm.reset({
      name: '',
      specialty: '',
      isAvailable: true,
      userId: 0
    });
  }

  private loadDashboardData(showLoading = true, checkNotifications = true): void {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';
    this.loadWarnings = [];

    forkJoin({
      services: this.loadWithFallback(this.servicesApi.getAll(), [] as SpaService[], 'services'),
      packages: this.loadWithFallback(this.packagesApi.getAll(), [] as SpaPackage[], 'packages'),
      therapists: this.loadWithFallback(this.therapistApi.getAll(), [] as Therapist[], 'therapists'),
      users: this.loadWithFallback(this.userApi.getAll(), [] as UserProfile[], 'users'),
      appointments: this.loadWithFallback(this.appointmentsApi.getAll(), [] as Appointment[], 'bookings'),
      inquiries: this.loadWithFallback(this.inquiryApi.getAll(), [] as Inquiry[], 'inquiries')
    }).subscribe({
      next: ({ services, packages, therapists, users, appointments, inquiries }) => {
        this.services = services;
        this.packages = packages;
        this.therapists = therapists;
        this.users = users;
        this.appointments = appointments;
        this.inquiries = inquiries;
        if (this.replyingInquiryId && !inquiries.some((inquiry) => inquiry.id === this.replyingInquiryId)) {
          this.cancelReply();
        }
        this.initializeBookingDrafts(appointments);
        if (checkNotifications) {
          this.handleAdminNotifications(appointments, inquiries);
        }

        if (this.loadWarnings.length > 0) {
          this.errorMessage = `Some sections could not load (${this.loadWarnings.join(', ')}).`;
        }

        this.loading = false;
      },
      error: (error) => {
        if (error?.status === 0) {
          this.errorMessage = 'Backend API is offline. Start LoveSpaBackend and try again.';
        } else if (error?.status === 401 || error?.status === 403) {
          this.errorMessage = 'Your session expired or you do not have admin access. Please log in again.';
        } else {
          this.errorMessage = 'Could not load admin dashboard data.';
        }

        this.loading = false;
      }
    });
  }

  private loadWithFallback<T>(source: Observable<T>, fallbackValue: T, label: string): Observable<T> {
    return source.pipe(
      catchError((error) => {
        if (error?.status === 0 || error?.status === 401 || error?.status === 403) {
          return throwError(() => error);
        }

        this.loadWarnings.push(label);
        return of(fallbackValue);
      })
    );
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.loadDashboardData(false, true);
    }, this.refreshIntervalMs);
  }

  private handleAdminNotifications(appointments: Appointment[], inquiries: Inquiry[]): void {
    const storageKey = this.notificationStorageKey();
    const previous = this.loadNotificationState(storageKey);
    const bookingIds = appointments.map((appointment) => appointment.id);
    const inquiryIds = inquiries.map((inquiry) => inquiry.id);
    const bookingStatuses = this.toBookingStatusMap(appointments);

    if (!this.notificationsInitialized) {
      this.notificationsInitialized = true;
      this.saveNotificationState(storageKey, bookingIds, inquiryIds, bookingStatuses);
      return;
    }

    const previousBookings = new Set(previous.bookingIds);
    const previousInquiries = new Set(previous.inquiryIds);

    const newBookingsCount = bookingIds.filter((id) => !previousBookings.has(id)).length;
    const newInquiriesCount = inquiryIds.filter((id) => !previousInquiries.has(id)).length;
    const approvalRequests = appointments.filter((appointment) => {
      const previousStatus = previous.bookingStatuses[appointment.id];
      return (
        appointment.status === 'Pending Approval' &&
        previousStatus !== 'Pending Approval'
      );
    });

    if (approvalRequests.length > 0) {
      const firstRequest = approvalRequests[0];
      this.adminNotice =
        approvalRequests.length === 1
          ? `Approval needed: ${firstRequest.therapistName} requested completion for booking #${firstRequest.id}.`
          : `Approval needed: ${approvalRequests.length} bookings were marked completed by staff.`;
      this.startNoticeTimer();
    } else if (newBookingsCount > 0 || newInquiriesCount > 0) {
      this.adminNotice = this.buildNoticeMessage(newBookingsCount, newInquiriesCount);
      this.startNoticeTimer();
    }

    this.saveNotificationState(storageKey, bookingIds, inquiryIds, bookingStatuses);
  }

  private notificationStorageKey(): string {
    const userId = this.authService.currentUser?.id ?? 'admin';
    return `love_spa_admin_seen_items_${userId}`;
  }

  private loadNotificationState(storageKey: string): {
    bookingIds: number[];
    inquiryIds: number[];
    bookingStatuses: Record<number, AppointmentStatus>;
  } {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return { bookingIds: [], inquiryIds: [], bookingStatuses: {} };
    }

    try {
      const parsed = JSON.parse(raw) as {
        bookingIds?: number[];
        inquiryIds?: number[];
        bookingStatuses?: Record<string, AppointmentStatus>;
      };
      const bookingStatuses: Record<number, AppointmentStatus> = {};
      for (const [idKey, status] of Object.entries(parsed.bookingStatuses ?? {})) {
        const parsedId = Number(idKey);
        if (Number.isInteger(parsedId) && parsedId > 0) {
          bookingStatuses[parsedId] = status;
        }
      }

      return {
        bookingIds: (parsed.bookingIds ?? []).filter((id) => Number.isInteger(id) && id > 0),
        inquiryIds: (parsed.inquiryIds ?? []).filter((id) => Number.isInteger(id) && id > 0),
        bookingStatuses
      };
    } catch {
      return { bookingIds: [], inquiryIds: [], bookingStatuses: {} };
    }
  }

  private saveNotificationState(
    storageKey: string,
    bookingIds: number[],
    inquiryIds: number[],
    bookingStatuses: Record<number, AppointmentStatus>
  ): void {
    localStorage.setItem(storageKey, JSON.stringify({ bookingIds, inquiryIds, bookingStatuses }));
  }

  private toBookingStatusMap(appointments: Appointment[]): Record<number, AppointmentStatus> {
    const map: Record<number, AppointmentStatus> = {};
    for (const appointment of appointments) {
      map[appointment.id] = appointment.status;
    }

    return map;
  }

  private buildNoticeMessage(newBookingsCount: number, newInquiriesCount: number): string {
    const parts: string[] = [];

    if (newBookingsCount > 0) {
      parts.push(newBookingsCount === 1 ? '1 new booking' : `${newBookingsCount} new bookings`);
    }

    if (newInquiriesCount > 0) {
      parts.push(newInquiriesCount === 1 ? '1 new inquiry' : `${newInquiriesCount} new inquiries`);
    }

    return `New activity: ${parts.join(' and ')}.`;
  }

  private startNoticeTimer(): void {
    this.clearNoticeTimer();
    this.noticeTimer = setTimeout(() => {
      this.adminNotice = '';
      this.noticeTimer = null;
    }, 6000);
  }

  private clearNoticeTimer(): void {
    if (!this.noticeTimer) {
      return;
    }

    clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
  }

  private initializeBookingDrafts(appointments: Appointment[]): void {
    for (const key of Object.keys(this.bookingDrafts)) {
      delete this.bookingDrafts[Number(key)];
    }

    for (const appointment of appointments) {
      this.bookingDrafts[appointment.id] = {
        therapistId: appointment.therapistId,
        status: appointment.status
      };
    }
  }

  private firstName(fullName: string): string {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return 'there';
    }

    return trimmed.split(/\s+/)[0];
  }
}

