using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using LoveSpaBackend.Common;

namespace LoveSpaBackend.Models;

[Table("Inquiries")]
public class Inquiry
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(120)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? Phone { get; set; }

    [Required]
    [MaxLength(2000)]
    public string Message { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = InquiryStatuses.Pending;

    [MaxLength(250)]
    public string? LastReplySubject { get; set; }

    [MaxLength(1200)]
    public string? AdminNotes { get; set; }

    public DateTime? RespondedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
