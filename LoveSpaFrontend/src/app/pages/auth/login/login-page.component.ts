import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  loading = false;
  errorMessage = '';

  get f() {
    return this.loginForm.controls;
  }

  submit(): void {
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: (session) => {
        this.loading = false;
        this.navigateToRoleDashboard(session.user.role);
      },
      error: (error) => {
        this.loading = false;
        if (error?.status === 0) {
          this.errorMessage = 'Backend API is offline. Start LoveSpaBackend and try again.';
          return;
        }

        if (error?.status === 401) {
          this.errorMessage = 'Invalid email or password.';
          return;
        }

        this.errorMessage = error?.error?.message ?? 'Unable to log in right now. Please try again.';
      }
    });
  }

  private navigateToRoleDashboard(role: string): void {
    const target =
      role === 'Admin'
        ? '/dashboard/admin'
        : role === 'Staff'
          ? '/dashboard/staff'
          : '/dashboard/customer';

    void this.router.navigateByUrl(target);
  }
}
