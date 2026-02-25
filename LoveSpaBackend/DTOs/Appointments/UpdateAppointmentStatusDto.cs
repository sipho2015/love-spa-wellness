using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Appointments;

public class UpdateAppointmentStatusDto
{
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = string.Empty;
}
