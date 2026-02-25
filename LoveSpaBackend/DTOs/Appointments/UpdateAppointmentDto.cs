using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Appointments;

public class UpdateAppointmentDto
{
    [Required]
    public int ServiceId { get; set; }

    [Required]
    public int TherapistId { get; set; }

    [Required]
    [MaxLength(120)]
    public string CustomerName { get; set; } = string.Empty;

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

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = string.Empty;
}
