namespace LoveSpaBackend.Common;

public static class DepositStatuses
{
    public const string Pending = "Pending";
    public const string Submitted = "Submitted";
    public const string Verified = "Verified";

    public static readonly string[] All = [Pending, Submitted, Verified];
}
