using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Packages;

public class SavePackageDto
{
    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(800)]
    public string Description { get; set; } = string.Empty;

    [Range(30, 600)]
    public int DurationMinutes { get; set; }

    [Range(1, 10000)]
    public decimal OriginalPrice { get; set; }

    [Range(1, 10000)]
    public decimal PackagePrice { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; }

    [MinLength(1)]
    public IReadOnlyList<int> ServiceIds { get; set; } = [];
}
