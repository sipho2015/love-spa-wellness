using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Appointments;

public class CreateAppointmentDto
{
    [Required]
    public int ServiceId { get; set; }

    [Required]
    public int TherapistId { get; set; }

    [MaxLength(120)]
    public string? CustomerName { get; set; }

    [MaxLength(160)]
    [EmailAddress]
    public string? CustomerEmail { get; set; }

    [Required]
    [MaxLength(30)]
    public string CustomerPhone { get; set; } = string.Empty;

    public DateOnly AppointmentDate { get; set; }

    [Required]
    [MaxLength(60)]
    public string TimeSlot { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Allergies { get; set; }

    [MaxLength(1200)]
    public string? HealthConcerns { get; set; }
}
