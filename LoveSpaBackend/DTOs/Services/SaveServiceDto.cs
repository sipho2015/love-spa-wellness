using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Services;

public class SaveServiceDto
{
    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(800)]
    public string Description { get; set; } = string.Empty;

    [Range(15, 480)]
    public int DurationMinutes { get; set; }

    [Range(typeof(decimal), "1", "10000")]
    public decimal Price { get; set; }

    public bool IsActive { get; set; } = true;
}
