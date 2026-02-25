using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LoveSpaBackend.Models;

[Table("Notifications")]
public class Notification
{
    [Key]
    public int Id { get; set; }

    public int? UserId { get; set; }

    [MaxLength(20)]
    public string? Role { get; set; }

    [Required]
    [MaxLength(140)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1200)]
    public string Message { get; set; } = string.Empty;

    [Required]
    [MaxLength(24)]
    public string Type { get; set; } = "Info";

    [MaxLength(40)]
    public string? EntityType { get; set; }

    public int? EntityId { get; set; }

    public bool IsRead { get; set; }

    public DateTime? ReadAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
