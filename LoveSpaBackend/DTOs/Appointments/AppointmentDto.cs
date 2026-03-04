namespace LoveSpaBackend.DTOs.Appointments;

public class AppointmentDto
{
    public int Id { get; set; }
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public int TherapistId { get; set; }
    public string TherapistName { get; set; } = string.Empty;
    public int? CustomerUserId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string CustomerPhone { get; set; } = string.Empty;
    public DateOnly AppointmentDate { get; set; }
    public string TimeSlot { get; set; } = string.Empty;
    public string? Allergies { get; set; }
    public string? HealthConcerns { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal DepositAmount { get; set; }
    public string DepositStatus { get; set; } = string.Empty;
    public string? PaymentReference { get; set; }
    public DateTime? DepositSubmittedAtUtc { get; set; }
    public DateTime? DepositVerifiedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
