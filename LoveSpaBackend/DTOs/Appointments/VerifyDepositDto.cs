using System.ComponentModel.DataAnnotations;

namespace LoveSpaBackend.DTOs.Appointments;

public class VerifyDepositDto
{
    [MaxLength(120)]
    public string? PaymentReference { get; set; }

    public bool MarkBookingConfirmed { get; set; } = true;
}
