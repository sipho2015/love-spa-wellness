export interface Therapist {
  id: number;
  name: string;
  specialty: string;
  isAvailable: boolean;
  userId?: number | null;
  userFullName?: string | null;
  userEmail?: string | null;
}

export interface SaveTherapistRequest {
  name: string;
  specialty: string;
  isAvailable: boolean;
  userId?: number | null;
}
