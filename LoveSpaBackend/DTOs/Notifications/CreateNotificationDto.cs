using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Notifications;

public class CreateNotificationDto
{
    public int? UserId { get; set; }

    [MaxLength(20)]
    public string? Role { get; set; }

    [Required]
    [MaxLength(140)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1200)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(24)]
    public string Type { get; set; } = "Info";

    [MaxLength(40)]
    public string? EntityType { get; set; }

    public int? EntityId { get; set; }
}
