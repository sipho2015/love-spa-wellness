using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Auth;

public class ForgotPasswordRequestDto
{
    [Required]
    [EmailAddress]
    [MaxLength(160)]
    public string Email { get; set; } = string.Empty;
}
