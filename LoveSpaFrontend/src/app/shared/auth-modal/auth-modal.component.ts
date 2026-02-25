import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthModalMode, AuthModalService } from '../../core/services/auth-modal.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authModalService = inject(AuthModalService);
  private readonly router = inject(Router);

  readonly state$ = this.authModalService.state$;

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    { validators: [this.passwordsMatch('password', 'confirmPassword')] }
  );

  readonly forgotPasswordForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  readonly resetPasswordForm = this.formBuilder.nonNullable.group(
    {
      token: ['', [Validators.required, Validators.minLength(20)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmNewPassword: ['', [Validators.required]]
    },
    { validators: [this.passwordsMatch('newPassword', 'confirmNewPassword')] }
  );

  loading = false;
  errorMessage = '';
  successMessage = '';
  developmentToken = '';

  get isOpen(): boolean {
    return this.authModalService.currentState.isOpen;
  }

  get mode(): AuthModalMode {
    return this.authModalService.currentState.mode;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  close(): void {
    this.loading = false;
    this.clearMessages();
    this.developmentToken = '';
    this.authModalService.close();
  }

  switchMode(mode: AuthModalMode): void {
    this.loading = false;
    this.clearMessages();
    if (mode !== 'reset') {
      this.developmentToken = '';
    }
    this.authModalService.setMode(mode);
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    this.close();
  }

  submitLogin(): void {
    this.clearMessages();

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: (session) => {
        this.loading = false;
        this.close();
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

  submitRegister(): void {
    this.clearMessages();

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { fullName, email, password } = this.registerForm.getRawValue();
    this.loading = true;

    this.authService.register({ fullName: fullName.trim(), email: email.trim(), password }).subscribe({
      next: () => {
        this.loading = false;
        this.close();
        void this.router.navigateByUrl('/dashboard/customer');
      },
      error: (error) => {
        this.loading = false;
        if (error?.status === 0) {
          this.errorMessage = 'Backend API is offline. Start LoveSpaBackend and try again.';
          return;
        }

        this.errorMessage = error?.error?.message ?? 'Unable to create account right now.';
      }
    });
  }

  submitForgotPassword(): void {
    this.clearMessages();

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.forgotPasswordForm.getRawValue();
    this.authService.forgotPassword({ email: payload.email.trim() }).subscribe({
        next: (response) => {
          this.loading = false;
          this.successMessage = response.message;
          this.developmentToken = response.resetToken ?? '';

          if (response.resetToken) {
            this.resetPasswordForm.patchValue({ token: response.resetToken });
            this.authModalService.setMode('reset');
            this.successMessage = 'Reset token generated. Create your new password below.';
          }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to process password reset right now.';
      }
    });
  }

  submitResetPassword(): void {
    this.clearMessages();

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const value = this.resetPasswordForm.getRawValue();
    this.loading = true;
    this.authService
      .resetPassword({
        token: value.token.trim(),
        newPassword: value.newPassword
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.resetPasswordForm.reset({
            token: '',
            newPassword: '',
            confirmNewPassword: ''
          });
          this.authModalService.setMode('login');
          this.successMessage = response.message;
          this.developmentToken = '';
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error?.error?.message ?? 'Password reset failed. Check your token and try again.';
        }
      });
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
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

  private passwordsMatch(firstField: string, secondField: string) {
    return (control: AbstractControl) => {
      const first = control.get(firstField)?.value as string | undefined;
      const second = control.get(secondField)?.value as string | undefined;
      return first === second ? null : { passwordMismatch: true };
    };
  }
}
