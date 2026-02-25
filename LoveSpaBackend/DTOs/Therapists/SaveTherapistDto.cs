using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Therapists;

public class SaveTherapistDto
{
    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Specialty { get; set; } = string.Empty;

    public bool IsAvailable { get; set; } = true;

    public int? UserId { get; set; }
}
