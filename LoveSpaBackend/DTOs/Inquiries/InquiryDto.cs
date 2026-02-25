namespace LoveSpaBackend.DTOs.Inquiries;

public class InquiryDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? LastReplySubject { get; set; }
    public string? AdminNotes { get; set; }
    public DateTime? RespondedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
