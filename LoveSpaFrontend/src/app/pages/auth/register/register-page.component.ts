import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss'
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    },
    {
      validators: [this.passwordsMatch]
    }
  );

  loading = false;
  errorMessage = '';

  get f() {
    return this.registerForm.controls;
  }

  submit(): void {
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { fullName, email, password } = this.registerForm.getRawValue();
    this.loading = true;

    this.authService.register({ fullName: fullName.trim(), email: email.trim(), password }).subscribe({
      next: () => {
        this.loading = false;
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

  private passwordsMatch(control: AbstractControl) {
    const password = control.get('password')?.value as string | undefined;
    const confirmPassword = control.get('confirmPassword')?.value as string | undefined;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }
}
