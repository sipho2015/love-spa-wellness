using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Inquiries;
using LoveSpaBackend.Models;
using LoveSpaBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InquiriesController(
    ApplicationDbContext context,
    IInquiryEmailService inquiryEmailService,
    INotificationService notificationService) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<InquiryDto>> Create(CreateInquiryDto request)
    {
        var inquiry = new Inquiry
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Message = request.Message.Trim(),
            Status = InquiryStatuses.Pending,
            CreatedAtUtc = DateTime.UtcNow
        };

        context.Inquiries.Add(inquiry);
        await context.SaveChangesAsync();
        await NotifyAdminsOfNewInquiryAsync(inquiry);

        return CreatedAtAction(nameof(GetById), new { id = inquiry.Id }, ToDto(inquiry));
    }

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<InquiryDto>>> GetAll()
    {
        var inquiries = await context.Inquiries
            .AsNoTracking()
            .OrderByDescending(i => i.CreatedAtUtc)
            .Select(i => ToDto(i))
            .ToListAsync();

        return Ok(inquiries);
    }

    [HttpGet("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<InquiryDto>> GetById(int id)
    {
        var inquiry = await context.Inquiries.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
        return inquiry is null ? NotFound() : Ok(ToDto(inquiry));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<InquiryDto>> UpdateStatus(int id, UpdateInquiryStatusDto request)
    {
        var inquiry = await context.Inquiries.FirstOrDefaultAsync(i => i.Id == id);
        if (inquiry is null)
        {
            return NotFound();
        }

        var normalizedStatus = NormalizeStatus(request.Status);
        if (normalizedStatus is null)
        {
            return BadRequest(new { message = $"Status must be one of: {string.Join(", ", InquiryStatuses.All)}." });
        }

        inquiry.Status = normalizedStatus;
        inquiry.AdminNotes = NormalizeOptional(request.AdminNotes);

        if (normalizedStatus == InquiryStatuses.Handled)
        {
            inquiry.RespondedAtUtc ??= DateTime.UtcNow;
        }
        else if (normalizedStatus == InquiryStatuses.Pending)
        {
            inquiry.RespondedAtUtc = null;
        }

        await context.SaveChangesAsync();
        return Ok(ToDto(inquiry));
    }

    [HttpPost("{id:int}/reply")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<InquiryDto>> Reply(int id, ReplyToInquiryDto request)
    {
        var inquiry = await context.Inquiries.FirstOrDefaultAsync(i => i.Id == id);
        if (inquiry is null)
        {
            return NotFound();
        }

        var subject = request.Subject.Trim();
        var body = request.Body.Trim();

        if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(body))
        {
            return BadRequest(new { message = "Subject and body are required." });
        }

        var sendResult = await inquiryEmailService.SendAsync(inquiry.FullName, inquiry.Email, subject, body);
        if (!sendResult.IsSuccess)
        {
            return BadRequest(new { message = sendResult.Message });
        }

        inquiry.LastReplySubject = subject;
        inquiry.AdminNotes = NormalizeOptional(request.AdminNotes) ?? inquiry.AdminNotes;
        inquiry.RespondedAtUtc = DateTime.UtcNow;
        if (request.MarkAsHandled)
        {
            inquiry.Status = InquiryStatuses.Handled;
        }

        await context.SaveChangesAsync();
        return Ok(ToDto(inquiry));
    }

    private static InquiryDto ToDto(Inquiry inquiry) =>
        new()
        {
            Id = inquiry.Id,
            FullName = inquiry.FullName,
            Email = inquiry.Email,
            Phone = inquiry.Phone,
            Message = inquiry.Message,
            Status = inquiry.Status,
            LastReplySubject = inquiry.LastReplySubject,
            AdminNotes = inquiry.AdminNotes,
            RespondedAtUtc = inquiry.RespondedAtUtc,
            CreatedAtUtc = inquiry.CreatedAtUtc
        };

    private static string? NormalizeStatus(string status) =>
        InquiryStatuses.All.FirstOrDefault(value => string.Equals(value, status, StringComparison.OrdinalIgnoreCase));

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private async Task NotifyAdminsOfNewInquiryAsync(Inquiry inquiry)
    {
        var subject = $"New inquiry received #{inquiry.Id}";
        var body =
            $"Name: {inquiry.FullName}\n" +
            $"Email: {inquiry.Email}\n" +
            $"Phone: {inquiry.Phone ?? "Not provided"}\n\n" +
            $"Message:\n{inquiry.Message}";

        var admins = await context.Users
            .AsNoTracking()
            .Where(user => user.Role == Roles.Admin)
            .Select(user => new { user.Id, user.FullName, user.Email })
            .ToListAsync();

        foreach (var admin in admins)
        {
            await inquiryEmailService.SendAsync(admin.FullName, admin.Email, subject, body);
            await notificationService.CreateForUserAsync(
                admin.Id,
                subject,
                body,
                NotificationTypes.Alert,
                nameof(Inquiry),
                inquiry.Id);
        }
    }
}
