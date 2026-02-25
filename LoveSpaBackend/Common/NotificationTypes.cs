namespace LoveSpaBackend.Common;

public static class NotificationTypes
{
    public const string Info = "Info";
    public const string Success = "Success";
    public const string Warning = "Warning";
    public const string Alert = "Alert";

    public static readonly string[] All = [Info, Success, Warning, Alert];
}
