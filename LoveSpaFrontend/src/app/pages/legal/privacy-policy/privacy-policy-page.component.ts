import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_SITE_PROFILE, SiteProfile } from '../../../core/models/site-profile.models';
import { SiteProfileApiService } from '../../../core/services/site-profile-api.service';

@Component({
  selector: 'app-privacy-policy-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy-policy-page.component.html',
  styleUrl: './privacy-policy-page.component.scss'
})
export class PrivacyPolicyPageComponent {
  private readonly siteProfileApi = inject(SiteProfileApiService);
  readonly effectiveDate = 'February 24, 2026';
  readonly siteProfile = signal<SiteProfile>(DEFAULT_SITE_PROFILE);

  constructor() {
    this.siteProfileApi.get().subscribe({
      next: (profile) => {
        this.siteProfile.set(profile);
      },
      error: () => {
        // Keep defaults when backend profile endpoint is unavailable.
      }
    });
  }

  get mailtoSupport(): string {
    return `mailto:${this.siteProfile().supportEmail}`;
  }
}
