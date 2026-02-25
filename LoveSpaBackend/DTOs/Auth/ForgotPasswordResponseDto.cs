namespace LoveSpaBackend.DTOs.Auth;

public class ForgotPasswordResponseDto
{
    public string Message { get; set; } = string.Empty;

    // Development-only helper when SMTP is not configured.
    public string? ResetToken { get; set; }
}
