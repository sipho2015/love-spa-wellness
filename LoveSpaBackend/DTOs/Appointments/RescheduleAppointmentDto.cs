using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Appointments;

public class RescheduleAppointmentDto
{
    public DateOnly AppointmentDate { get; set; }

    [Required]
    [MaxLength(60)]
    public string TimeSlot { get; set; } = string.Empty;
}
