using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Inquiries;

public class ReplyToInquiryDto
{
    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string Body { get; set; } = string.Empty;

    [MaxLength(1200)]
    public string? AdminNotes { get; set; }

    public bool MarkAsHandled { get; set; } = true;
}
