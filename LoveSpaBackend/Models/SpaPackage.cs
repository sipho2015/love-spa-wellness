using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LoveSpaBackend.Models;

[Table("Packages")]
public class SpaPackage
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(800)]
    public string Description { get; set; } = string.Empty;

    [Range(30, 600)]
    public int DurationMinutes { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal OriginalPrice { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal PackagePrice { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<PackageService> PackageServices { get; set; } = new List<PackageService>();
}
