namespace LoveSpaBackend.DTOs.Appointments;

public class AppointmentAvailabilityDto
{
    public int TherapistId { get; set; }
    public DateOnly AppointmentDate { get; set; }
    public int DurationMinutes { get; set; }
    public bool TherapistAvailable { get; set; }
    public string? Message { get; set; }
    public IReadOnlyList<string> AvailableSlots { get; set; } = [];
}
