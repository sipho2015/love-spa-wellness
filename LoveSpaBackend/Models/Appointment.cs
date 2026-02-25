using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using LoveSpaBackend.Common;

namespace LoveSpaBackend.Models;

[Table("Appointments")]
public class Appointment
{
    [Key]
    public int Id { get; set; }

    [ForeignKey(nameof(Service))]
    public int ServiceId { get; set; }

    public SpaService? Service { get; set; }

    [ForeignKey(nameof(Therapist))]
    public int TherapistId { get; set; }

    public Therapist? Therapist { get; set; }

    [ForeignKey(nameof(CustomerUser))]
    public int? CustomerUserId { get; set; }

    public User? CustomerUser { get; set; }

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
    public string Status { get; set; } = AppointmentStatuses.Pending;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
