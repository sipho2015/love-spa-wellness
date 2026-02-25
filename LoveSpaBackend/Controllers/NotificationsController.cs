using System.Security.Claims;
using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Notifications;
using LoveSpaBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(ApplicationDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<NotificationDto>>> GetMy([FromQuery] bool unreadOnly = false, [FromQuery] int take = 40)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (!userId.HasValue || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized();
        }

        var safeTake = Math.Clamp(take, 1, 100);
        var query = context.Notifications
            .AsNoTracking()
            .Where(notification =>
                notification.UserId == userId.Value ||
                (notification.UserId == null && notification.Role == role));

        if (unreadOnly)
        {
            query = query.Where(notification => !notification.IsRead);
        }

        var notifications = await query
            .OrderByDescending(notification => notification.CreatedAtUtc)
            .Take(safeTake)
            .ToListAsync();

        return Ok(notifications.Select(ToDto));
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<object>> GetUnreadCount()
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (!userId.HasValue || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized();
        }

        var count = await context.Notifications.CountAsync(notification =>
            !notification.IsRead &&
            (notification.UserId == userId.Value ||
             (notification.UserId == null && notification.Role == role)));

        return Ok(new { count });
    }

    [HttpPatch("{id:int}/read")]
    public async Task<ActionResult<NotificationDto>> MarkRead(int id)
    {
        var notification = await FindCurrentUserNotificationAsync(id);
        if (notification is null)
        {
            return NotFound();
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }

        return Ok(ToDto(notification));
    }

    [HttpPatch("read-all")]
    public async Task<ActionResult<object>> MarkAllRead()
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (!userId.HasValue || string.IsNullOrWhiteSpace(role))
        {
            return Unauthorized();
        }

        var notifications = await context.Notifications
            .Where(notification =>
                !notification.IsRead &&
                (notification.UserId == userId.Value ||
                 (notification.UserId == null && notification.Role == role)))
            .ToListAsync();

        if (notifications.Count == 0)
        {
            return Ok(new { updated = 0 });
        }

        var now = DateTime.UtcNow;
        foreach (var notification in notifications)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = now;
        }

        await context.SaveChangesAsync();
        return Ok(new { updated = notifications.Count });
    }

    private async Task<Notification?> FindCurrentUserNotificationAsync(int notificationId)
    {
        var userId = GetCurrentUserId();
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (!userId.HasValue || string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        return await context.Notifications.FirstOrDefaultAsync(notification =>
            notification.Id == notificationId &&
            (notification.UserId == userId.Value ||
             (notification.UserId == null && notification.Role == role)));
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private static NotificationDto ToDto(Notification notification) =>
        new()
        {
            Id = notification.Id,
            Title = notification.Title,
            Message = notification.Message,
            Type = notification.Type,
            EntityType = notification.EntityType,
            EntityId = notification.EntityId,
            IsRead = notification.IsRead,
            ReadAtUtc = notification.ReadAtUtc,
            CreatedAtUtc = notification.CreatedAtUtc
        };
}
