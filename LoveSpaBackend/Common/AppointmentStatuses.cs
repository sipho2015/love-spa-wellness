namespace LoveSpaBackend.Common;

public static class AppointmentStatuses
{
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string CompletedPendingApproval = "Pending Approval";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";

    public static readonly string[] All = [Pending, Confirmed, CompletedPendingApproval, Completed, Cancelled];
}

