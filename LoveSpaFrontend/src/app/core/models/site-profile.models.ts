export interface SiteProfile {
  businessName: string;
  supportEmail: string;
  phoneDisplay: string;
  phoneDial: string;
  whatsAppUrl: string;
  address: string;
  instagramUrl: string;
  openingHours: string[];
}

export const DEFAULT_SITE_PROFILE: SiteProfile = {
  businessName: 'Love Spa & Wellness',
  supportEmail: 'siphomoyo893@gmail.com',
  phoneDisplay: '+263 789 652 298',
  phoneDial: '+263789652298',
  whatsAppUrl: 'https://wa.me/263789652298',
  address: 'Victoria Falls, Zimbabwe',
  instagramUrl: 'https://www.instagram.com/love_spa_wellness/',
  openingHours: ['Mon - Fri: 9:00 AM - 8:00 PM', 'Sat: 10:00 AM - 7:00 PM', 'Sun: 10:00 AM - 6:00 PM']
};
