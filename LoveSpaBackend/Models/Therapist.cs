using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LoveSpaBackend.Models;

[Table("Therapists")]
public class Therapist
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Specialty { get; set; } = string.Empty;

    public bool IsAvailable { get; set; } = true;

    public int? UserId { get; set; }

    public User? User { get; set; }
}
