namespace LoveSpaBackend.DTOs.Therapists;

public class TherapistDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public int? UserId { get; set; }
    public string? UserFullName { get; set; }
    public string? UserEmail { get; set; }
}
