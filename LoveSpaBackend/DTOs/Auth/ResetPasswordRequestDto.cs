using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Auth;

public class ResetPasswordRequestDto
{
    [Required]
    [MinLength(20)]
    [MaxLength(200)]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;
}
