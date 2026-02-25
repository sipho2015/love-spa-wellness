using LoveSpaBackend.Common;
using LoveSpaBackend.DTOs.Notifications;

namespace LoveSpaBackend.Services;

public interface INotificationService
{
    Task CreateAsync(CreateNotificationDto request);
    Task CreateForRoleAsync(string role, string title, string message, string type = NotificationTypes.Info, string? entityType = null, int? entityId = null);
    Task CreateForUserAsync(int userId, string title, string message, string type = NotificationTypes.Info, string? entityType = null, int? entityId = null);
}
