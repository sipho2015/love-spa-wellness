import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Appointment, AppointmentStatus } from '../../../core/models/appointment.models';
import { AppointmentApiService } from '../../../core/services/appointment-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TherapistApiService } from '../../../core/services/therapist-api.service';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './staff-dashboard.component.html',
  styleUrl: './staff-dashboard.component.scss'
})
export class StaffDashboardComponent implements OnInit, OnDestroy {
  private readonly appointmentsApi = inject(AppointmentApiService);
  private readonly authService = inject(AuthService);
  private readonly therapistApi = inject(TherapistApiService);

  private readonly refreshIntervalMs = 30000;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statuses: AppointmentStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

  appointments: Appointment[] = [];
  loading = false;
  errorMessage = '';
  updateMessage = '';
  assignmentNotice = '';
  isTherapistLinked: boolean | null = null;
  updatingAppointmentId: number | null = null;

  ngOnInit(): void {
    this.loadTherapistLinkState();
    this.loadSchedule(true, true);
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.clearAssignmentNoticeTimer();
  }

  refresh(): void {
    this.loadTherapistLinkState();
    this.loadSchedule(true, true);
  }

  updateStatus(appointmentId: number, status: string): void {
    const normalizedStatus = status as AppointmentStatus;
    this.updatingAppointmentId = appointmentId;
    this.updateMessage = '';

    this.appointmentsApi.updateStatus(appointmentId, { status: normalizedStatus }).subscribe({
      next: (updated) => {
        this.appointments = this.appointments.map((appointment) =>
          appointment.id === appointmentId ? updated : appointment
        );
        this.updatingAppointmentId = null;
        this.updateMessage = `Appointment #${appointmentId} updated to ${normalizedStatus}.`;
      },
      error: () => {
        this.updatingAppointmentId = null;
        this.updateMessage = 'Could not update appointment status.';
      }
    });
  }

  private startAutoRefresh(): void {
    this.refreshTimer = setInterval(() => {
      this.loadSchedule(false, true);
    }, this.refreshIntervalMs);
  }

  private loadSchedule(showLoading: boolean, checkForNewAssignments: boolean): void {
    if (showLoading) {
      this.loading = true;
    }

    this.errorMessage = '';

    this.appointmentsApi.getStaffSchedule().subscribe({
      next: (appointments) => {
        if (checkForNewAssignments) {
          this.handleAssignmentNotifications(appointments);
        }

        this.appointments = appointments;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load your schedule.';
        this.loading = false;
      }
    });
  }

  private loadTherapistLinkState(): void {
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.isTherapistLinked = null;
      return;
    }

    this.therapistApi.getAll().subscribe({
      next: (therapists) => {
        const normalizedName = currentUser.fullName.trim().toLowerCase();
        this.isTherapistLinked = therapists.some((therapist) => {
          const userLinkMatch = therapist.userId === currentUser.id;
          const nameFallbackMatch =
            (therapist.userId === null || therapist.userId === undefined) &&
            therapist.name.trim().toLowerCase() === normalizedName;
          return userLinkMatch || nameFallbackMatch;
        });
      },
      error: () => {
        this.isTherapistLinked = null;
      }
    });
  }

  private handleAssignmentNotifications(appointments: Appointment[]): void {
    const storageKey = this.assignmentStorageKey();
    const seenIds = this.loadSeenAssignmentIds(storageKey);
    const activeIds = appointments
      .filter((appointment) => appointment.status !== 'Cancelled')
      .map((appointment) => appointment.id);
    const newAssignmentsCount = activeIds.filter((id) => !seenIds.has(id)).length;

    if (newAssignmentsCount > 0) {
      this.assignmentNotice =
        newAssignmentsCount === 1
          ? 'You have 1 new assignment.'
          : `You have ${newAssignmentsCount} new assignments.`;
      this.startAssignmentNoticeTimer();
    }

    localStorage.setItem(storageKey, JSON.stringify(activeIds));
  }

  private assignmentStorageKey(): string {
    const userId = this.authService.currentUser?.id ?? 'staff';
    return `love_spa_staff_seen_assignments_${userId}`;
  }

  private loadSeenAssignmentIds(storageKey: string): Set<number> {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return new Set<number>();
    }

    try {
      const parsed = JSON.parse(raw) as number[];
      return new Set(parsed.filter((value) => Number.isInteger(value) && value > 0));
    } catch {
      return new Set<number>();
    }
  }

  private startAssignmentNoticeTimer(): void {
    this.clearAssignmentNoticeTimer();
    this.noticeTimer = setTimeout(() => {
      this.assignmentNotice = '';
      this.noticeTimer = null;
    }, 6000);
  }

  private clearAssignmentNoticeTimer(): void {
    if (!this.noticeTimer) {
      return;
    }

    clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
  }
}
