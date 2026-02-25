using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Inquiries;

public class UpdateInquiryStatusDto
{
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = string.Empty;

    [MaxLength(1200)]
    public string? AdminNotes { get; set; }
}
