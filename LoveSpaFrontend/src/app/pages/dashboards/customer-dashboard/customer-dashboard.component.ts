import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Appointment } from '../../../core/models/appointment.models';
import { AppointmentApiService } from '../../../core/services/appointment-api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './customer-dashboard.component.html',
  styleUrl: './customer-dashboard.component.scss'
})
export class CustomerDashboardComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly appointmentsApi = inject(AppointmentApiService);
  private readonly authService = inject(AuthService);

  private readonly refreshIntervalMs = 30000;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly minDate = new Date().toISOString().slice(0, 10);
  readonly rescheduleForm = this.formBuilder.nonNullable.group({
    appointmentDate: ['', [Validators.required]],
    timeSlot: ['', [Validators.required, Validators.maxLength(60)]]
  });

  appointments: Appointment[] = [];
  rescheduleTarget: Appointment | null = null;
  loading = false;
  errorMessage = '';
  updateMessage = '';
  statusNotice = '';
  rescheduleError = '';
  actionLoadingId: number | null = null;

  ngOnInit(): void {
    this.loadBookings(true, true);
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.clearNoticeTimer();
  }

  get rf() {
    return this.rescheduleForm.controls;
  }

  refresh(): void {
    this.loadBookings(true, true);
  }

  canManage(appointment: Appointment): boolean {
    if (appointment.status !== 'Pending' && appointment.status !== 'Confirmed') {
      return false;
    }

    const appointmentDate = appointment.appointmentDate.slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return appointmentDate >= today;
  }

  cancelBooking(appointment: Appointment): void {
    if (!this.canManage(appointment)) {
      return;
    }

    if (!window.confirm('Cancel this booking?')) {
      return;
    }

    this.errorMessage = '';
    this.updateMessage = '';
    this.actionLoadingId = appointment.id;

    this.appointmentsApi.cancel(appointment.id).subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((item) => (item.id === appointment.id ? updated : item));
        this.updateMessage = `Booking #${appointment.id} has been cancelled.`;
        this.actionLoadingId = null;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Could not cancel booking right now.';
        this.actionLoadingId = null;
      }
    });
  }

  openRescheduleModal(appointment: Appointment): void {
    if (!this.canManage(appointment)) {
      return;
    }

    this.rescheduleTarget = appointment;
    this.rescheduleError = '';
    this.rescheduleForm.reset({
      appointmentDate: appointment.appointmentDate.slice(0, 10),
      timeSlot: appointment.timeSlot
    });
  }

  closeRescheduleModal(): void {
    if (this.actionLoadingId !== null) {
      return;
    }

    this.rescheduleTarget = null;
    this.rescheduleError = '';
  }

  onRescheduleBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    this.closeRescheduleModal();
  }

  submitReschedule(): void {
    if (!this.rescheduleTarget) {
      return;
    }

    if (this.rescheduleForm.invalid) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.updateMessage = '';
    this.rescheduleError = '';

    const target = this.rescheduleTarget;
    const value = this.rescheduleForm.getRawValue();

    this.actionLoadingId = target.id;

    this.appointmentsApi
      .reschedule(target.id, {
        appointmentDate: value.appointmentDate,
        timeSlot: value.timeSlot.trim()
      })
      .subscribe({
        next: (updated) => {
          this.appointments = this.appointments.map((item) => (item.id === target.id ? updated : item));
          this.updateMessage = `Booking #${target.id} has been rescheduled.`;
          this.actionLoadingId = null;
          this.closeRescheduleModal();
        },
        error: (error) => {
          this.rescheduleError = error?.error?.message ?? 'Could not reschedule booking right now.';
          this.actionLoadingId = null;
        }
      });
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.loadBookings(false, true);
    }, this.refreshIntervalMs);
  }

  private loadBookings(showLoading: boolean, checkForStatusUpdates: boolean): void {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';

    this.appointmentsApi.getMyBookings().subscribe({
      next: (appointments) => {
        if (checkForStatusUpdates) {
          this.handleStatusNotifications(appointments);
        }

        this.appointments = appointments;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.status === 0
            ? 'Backend API is offline. Start LoveSpaBackend and try again.'
            : 'Could not load your bookings right now.';
        this.loading = false;
      }
    });
  }

  private handleStatusNotifications(appointments: Appointment[]): void {
    const storageKey = this.statusStorageKey();
    const previous = this.loadSeenStatuses(storageKey);

    const changed = appointments.filter((appointment) => {
      const previousStatus = previous[appointment.id];
      return previousStatus !== undefined && previousStatus !== appointment.status;
    });

    if (changed.length > 0) {
      this.statusNotice =
        changed.length === 1
          ? `Booking #${changed[0].id} changed to ${changed[0].status}.`
          : `${changed.length} of your bookings were updated.`;
      this.startNoticeTimer();
    }

    const current: Record<number, string> = {};
    for (const appointment of appointments) {
      current[appointment.id] = appointment.status;
    }

    localStorage.setItem(storageKey, JSON.stringify(current));
  }

  private statusStorageKey(): string {
    const userId = this.authService.currentUser?.id ?? 'customer';
    return `love_spa_customer_booking_status_${userId}`;
  }

  private loadSeenStatuses(storageKey: string): Record<number, string> {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<number, string>;
    } catch {
      return {};
    }
  }

  private startNoticeTimer(): void {
    this.clearNoticeTimer();
    this.noticeTimer = setTimeout(() => {
      this.statusNotice = '';
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
}
