export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

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
  status: AppointmentStatus;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
}

export interface RescheduleAppointmentRequest {
  appointmentDate: string;
  timeSlot: string;
}

export interface AppointmentAvailability {
  therapistId: number;
  appointmentDate: string;
  durationMinutes: number;
  therapistAvailable: boolean;
  message?: string | null;
  availableSlots: string[];
}
