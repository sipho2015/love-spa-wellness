export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Pending Approval' | 'Completed' | 'Cancelled';
export type DepositStatus = 'Pending' | 'Submitted' | 'Verified';

export interface Appointment {
  id: number;
  serviceId: number;
  serviceName: string;
  therapistId: number;
  therapistName: string;
  customerUserId?: number | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  appointmentDate: string;
  timeSlot: string;
  allergies?: string | null;
  healthConcerns?: string | null;
  status: AppointmentStatus;
  depositAmount: number;
  depositStatus: DepositStatus;
  paymentReference?: string | null;
  depositSubmittedAtUtc?: string | null;
  depositVerifiedAtUtc?: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface CreateAppointmentRequest {
  serviceId: number;
  therapistId: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone: string;
  appointmentDate: string;
  timeSlot: string;
  allergies?: string;
  healthConcerns?: string;
  paymentReference?: string;
}

export interface UpdateAppointmentRequest {
  serviceId: number;
  therapistId: number;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  appointmentDate: string;
  timeSlot: string;
  allergies?: string;
  healthConcerns?: string;
  paymentReference?: string;
  status: AppointmentStatus;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface RescheduleAppointmentRequest {
  appointmentDate: string;
  timeSlot: string;
}

export interface VerifyDepositRequest {
  paymentReference?: string;
  markBookingConfirmed?: boolean;
}

export interface AppointmentAvailability {
  therapistId: number;
  appointmentDate: string;
  durationMinutes: number;
  therapistAvailable: boolean;
  message?: string | null;
  availableSlots: string[];
}

