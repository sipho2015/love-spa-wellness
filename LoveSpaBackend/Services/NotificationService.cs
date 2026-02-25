using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Notifications;
using LoveSpaBackend.Models;

namespace LoveSpaBackend.Services;

public class NotificationService(ApplicationDbContext context) : INotificationService
{
    public async Task CreateAsync(CreateNotificationDto request)
    {
        var normalizedType = NormalizeType(request.Type);

        context.Notifications.Add(new Notification
        {
            UserId = request.UserId,
            Role = NormalizeOptional(request.Role),
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            Type = normalizedType,
            EntityType = NormalizeOptional(request.EntityType),
            EntityId = request.EntityId,
            IsRead = false,
            CreatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();
    }

    public Task CreateForRoleAsync(
        string role,
        string title,
        string message,
        string type = NotificationTypes.Info,
        string? entityType = null,
        int? entityId = null) =>
        CreateAsync(new CreateNotificationDto
        {
            Role = role,
            Title = title,
            Message = message,
            Type = type,
            EntityType = entityType,
            EntityId = entityId
        });

    public Task CreateForUserAsync(
        int userId,
        string title,
        string message,
        string type = NotificationTypes.Info,
        string? entityType = null,
        int? entityId = null) =>
        CreateAsync(new CreateNotificationDto
        {
            UserId = userId,
            Title = title,
            Message = message,
            Type = type,
            EntityType = entityType,
            EntityId = entityId
        });

    private static string NormalizeType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type))
        {
            return NotificationTypes.Info;
        }

        return NotificationTypes.All
            .FirstOrDefault(value => string.Equals(value, type, StringComparison.OrdinalIgnoreCase))
            ?? NotificationTypes.Info;
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
