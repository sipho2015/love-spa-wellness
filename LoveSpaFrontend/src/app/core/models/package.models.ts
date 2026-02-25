export interface PackageIncludedService {
  id: number;
  name: string;
  durationMinutes: number;
}

export interface SpaPackage {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  originalPrice: number;
  packagePrice: number;
  savingsAmount: number;
  imageUrl?: string | null;
  isActive: boolean;
  includedServices: PackageIncludedService[];
}

export interface SavePackageRequest {
  name: string;
  description: string;
  durationMinutes: number;
  originalPrice: number;
  packagePrice: number;
  imageUrl?: string | null;
  isActive: boolean;
  serviceIds: number[];
}
