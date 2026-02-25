using System.Net.Mail;
using System.Security.Claims;
using System.Globalization;
using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Appointments;
using LoveSpaBackend.Models;
using LoveSpaBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AppointmentsController(
    ApplicationDbContext context,
    IInquiryEmailService emailService,
    INotificationService notificationService) : ControllerBase
{
    private static readonly string[] ClockFormats =
    [
        "h:mm tt",
        "hh:mm tt",
        "h:mmtt",
        "hh:mmtt",
        "H:mm",
        "HH:mm"
    ];
    private const int SlotIntervalMinutes = 30;

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<AppointmentDto>>> GetAll()
    {
        var appointments = await BuildAppointmentQuery()
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.TimeSlot)
            .ToListAsync();

        return Ok(appointments.Select(ToDto));
    }

    [HttpGet("availability")]
    [AllowAnonymous]
    public async Task<ActionResult<AppointmentAvailabilityDto>> GetAvailability(
        [FromQuery] int therapistId,
        [FromQuery] DateOnly appointmentDate,
        [FromQuery] int durationMinutes)
    {
        if (therapistId <= 0)
        {
            return BadRequest(new { message = "Therapist is required." });
        }

        if (durationMinutes is < 15 or > 240)
        {
            return BadRequest(new { message = "Duration must be between 15 and 240 minutes." });
        }

        var nowDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        if (appointmentDate < nowDate)
        {
            return BadRequest(new { message = "Appointment date cannot be in the past." });
        }

        var therapist = await context.Therapists
            .AsNoTracking()
            .FirstOrDefaultAsync(value => value.Id == therapistId);

        if (therapist is null)
        {
            return NotFound(new { message = "Therapist not found." });
        }

        if (!therapist.IsAvailable)
        {
            return Ok(new AppointmentAvailabilityDto
            {
                TherapistId = therapistId,
                AppointmentDate = appointmentDate,
                DurationMinutes = durationMinutes,
                TherapistAvailable = false,
                Message = "Selected therapist is currently unavailable.",
                AvailableSlots = []
            });
        }

        var (businessStart, businessEnd) = ResolveBusinessHours(appointmentDate);
        var existingBookings = await LoadTherapistDayRangesAsync(therapistId, appointmentDate);
        var slots = BuildAvailableSlots(businessStart, businessEnd, durationMinutes, existingBookings);

        return Ok(new AppointmentAvailabilityDto
        {
            TherapistId = therapistId,
            AppointmentDate = appointmentDate,
            DurationMinutes = durationMinutes,
            TherapistAvailable = true,
            Message = slots.Count == 0 ? "No available slots for the selected date." : null,
            AvailableSlots = slots
        });
    }

    [HttpGet("{id:int}")]
    [Authorize]
    public async Task<ActionResult<AppointmentDto>> GetById(int id)
    {
        var appointment = await BuildAppointmentQuery().FirstOrDefaultAsync(a => a.Id == id);
        if (appointment is null)
        {
            return NotFound();
        }

        if (User.IsInRole(Roles.Staff) && !await IsCurrentStaffAssignedAsync(appointment.TherapistId))
        {
            return Forbid();
        }

        if (User.IsInRole(Roles.Customer) && !IsCurrentCustomerOwner(appointment))
        {
            return Forbid();
        }

        return Ok(ToDto(appointment));
    }

    [HttpGet("my")]
    [Authorize(Roles = Roles.Customer)]
    public async Task<ActionResult<IEnumerable<AppointmentDto>>> GetMyBookings()
    {
        var customerName = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        var userId = GetCurrentUserId();

        var query = BuildAppointmentQuery().AsQueryable();

        if (userId.HasValue)
        {
            query = query.Where(a =>
                a.CustomerUserId == userId.Value ||
                (a.CustomerUserId == null && a.CustomerName == customerName));
        }
        else
        {
            query = query.Where(a => a.CustomerName == customerName);
        }

        var appointments = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ThenBy(a => a.TimeSlot)
            .ToListAsync();

        return Ok(appointments.Select(ToDto));
    }

    [HttpGet("staff/schedule")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<IEnumerable<AppointmentDto>>> GetStaffSchedule()
    {
        var therapistIds = await ResolveCurrentStaffTherapistIdsAsync();
        if (therapistIds.Count == 0)
        {
            return Ok(Array.Empty<AppointmentDto>());
        }

        var query = BuildAppointmentQuery()
            .Where(a => therapistIds.Contains(a.TherapistId));

        var appointments = await query
            .OrderBy(a => a.AppointmentDate)
            .ThenBy(a => a.TimeSlot)
            .ToListAsync();

        return Ok(appointments.Select(ToDto));
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<AppointmentDto>> Create(CreateAppointmentDto request)
    {
        var service = await context.Services.FirstOrDefaultAsync(s => s.Id == request.ServiceId && s.IsActive);
        if (service is null)
        {
            return BadRequest(new { message = "Selected service is not available." });
        }

        var therapist = await context.Therapists.FirstOrDefaultAsync(t => t.Id == request.TherapistId && t.IsAvailable);
        if (therapist is null)
        {
            return BadRequest(new { message = "Selected therapist is not available." });
        }

        var nowDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        if (request.AppointmentDate < nowDate)
        {
            return BadRequest(new { message = "Appointment date cannot be in the past." });
        }

        var timeSlot = NormalizeTimeSlot(request.TimeSlot);
        if (string.IsNullOrWhiteSpace(timeSlot))
        {
            return BadRequest(new { message = "Time slot is required." });
        }

        var isConflict = await HasTherapistTimeConflictAsync(
            request.TherapistId,
            request.AppointmentDate,
            timeSlot,
            service.DurationMinutes);
        if (isConflict)
        {
            return BadRequest(new { message = "Selected therapist is already booked for that date and time range." });
        }

        var role = User.FindFirstValue(ClaimTypes.Role);
        var currentUserId = GetCurrentUserId();
        var currentUserName = User.FindFirstValue(ClaimTypes.Name);
        var currentUserEmail = User.FindFirstValue(ClaimTypes.Email);

        var customerName = request.CustomerName?.Trim();
        if (role == Roles.Customer && !string.IsNullOrWhiteSpace(currentUserName))
        {
            customerName = currentUserName;
        }

        if (string.IsNullOrWhiteSpace(customerName))
        {
            return BadRequest(new { message = "Customer name is required." });
        }

        var emailSource = role == Roles.Customer && !string.IsNullOrWhiteSpace(currentUserEmail)
            ? currentUserEmail
            : request.CustomerEmail;

        if (!TryNormalizeOptionalEmail(emailSource, out var normalizedCustomerEmail) ||
            string.IsNullOrWhiteSpace(normalizedCustomerEmail))
        {
            return BadRequest(new { message = "A valid customer email is required for booking updates." });
        }

        var appointment = new Appointment
        {
            ServiceId = request.ServiceId,
            TherapistId = request.TherapistId,
            CustomerUserId = role == Roles.Customer ? currentUserId : null,
            CustomerName = customerName,
            CustomerEmail = normalizedCustomerEmail,
            CustomerPhone = request.CustomerPhone.Trim(),
            AppointmentDate = request.AppointmentDate,
            TimeSlot = timeSlot,
            Allergies = NormalizeOptional(request.Allergies),
            HealthConcerns = NormalizeOptional(request.HealthConcerns),
            Status = AppointmentStatuses.Pending,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        };

        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        appointment.Service = service;
        appointment.Therapist = therapist;

        await NotifyAdminsOfNewBookingAsync(appointment);

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, ToDto(appointment));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<AppointmentDto>> Update(int id, UpdateAppointmentDto request)
    {
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appointment is null)
        {
            return NotFound();
        }

        var service = await context.Services
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == request.ServiceId);
        if (service is null)
        {
            return BadRequest(new { message = "Service does not exist." });
        }

        var therapist = await context.Therapists.FirstOrDefaultAsync(t => t.Id == request.TherapistId);
        if (therapist is null)
        {
            return BadRequest(new { message = "Therapist does not exist." });
        }

        var normalizedStatus = NormalizeStatus(request.Status);
        if (normalizedStatus is null)
        {
            return BadRequest(new { message = $"Status must be one of: {string.Join(", ", AppointmentStatuses.All)}." });
        }

        var nowDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        if (request.AppointmentDate < nowDate && normalizedStatus != AppointmentStatuses.Cancelled)
        {
            return BadRequest(new { message = "Appointment date cannot be in the past unless booking is cancelled." });
        }

        var timeSlot = NormalizeTimeSlot(request.TimeSlot);
        if (string.IsNullOrWhiteSpace(timeSlot))
        {
            return BadRequest(new { message = "Time slot is required." });
        }

        if (normalizedStatus != AppointmentStatuses.Cancelled)
        {
            if (!therapist.IsAvailable)
            {
                return BadRequest(new { message = "Selected therapist is currently unavailable." });
            }

            var hasConflict = await HasTherapistTimeConflictAsync(
                request.TherapistId,
                request.AppointmentDate,
                timeSlot,
                service.DurationMinutes,
                id);
            if (hasConflict)
            {
                return BadRequest(new { message = "Selected therapist is already booked for that date and time range." });
            }
        }

        if (!TryNormalizeOptionalEmail(request.CustomerEmail, out var normalizedCustomerEmail))
        {
            return BadRequest(new { message = "Customer email format is invalid." });
        }

        var previousTherapistId = appointment.TherapistId;
        var previousStatus = appointment.Status;

        appointment.ServiceId = request.ServiceId;
        appointment.TherapistId = request.TherapistId;
        appointment.CustomerName = request.CustomerName.Trim();
        appointment.CustomerEmail = normalizedCustomerEmail ?? appointment.CustomerEmail;
        appointment.CustomerPhone = request.CustomerPhone.Trim();
        appointment.AppointmentDate = request.AppointmentDate;
        appointment.TimeSlot = timeSlot;
        appointment.Allergies = NormalizeOptional(request.Allergies);
        appointment.HealthConcerns = NormalizeOptional(request.HealthConcerns);
        appointment.Status = normalizedStatus;
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync();

        if (previousTherapistId != appointment.TherapistId)
        {
            await NotifyStaffOfAssignmentAsync(appointment);
        }

        if (!string.Equals(previousStatus, appointment.Status, StringComparison.Ordinal))
        {
            await NotifyCustomerOfStatusUpdateAsync(appointment);
        }

        var mapped = await BuildAppointmentQuery().FirstAsync(a => a.Id == id);
        return Ok(ToDto(mapped));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Staff}")]
    public async Task<ActionResult<AppointmentDto>> UpdateStatus(int id, UpdateAppointmentStatusDto request)
    {
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appointment is null)
        {
            return NotFound();
        }

        if (User.IsInRole(Roles.Staff) && !await IsCurrentStaffAssignedAsync(appointment.TherapistId))
        {
            return Forbid();
        }

        var normalizedStatus = NormalizeStatus(request.Status);
        if (normalizedStatus is null)
        {
            return BadRequest(new { message = $"Status must be one of: {string.Join(", ", AppointmentStatuses.All)}." });
        }

        if (string.Equals(appointment.Status, normalizedStatus, StringComparison.Ordinal))
        {
            var current = await BuildAppointmentQuery().FirstAsync(a => a.Id == id);
            return Ok(ToDto(current));
        }

        appointment.Status = normalizedStatus;
        appointment.UpdatedAtUtc = DateTime.UtcNow;
        await context.SaveChangesAsync();

        await NotifyCustomerOfStatusUpdateAsync(appointment);

        var mapped = await BuildAppointmentQuery().FirstAsync(a => a.Id == id);
        return Ok(ToDto(mapped));
    }

    [HttpPatch("{id:int}/reschedule")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Customer}")]
    public async Task<ActionResult<AppointmentDto>> Reschedule(int id, RescheduleAppointmentDto request)
    {
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appointment is null)
        {
            return NotFound();
        }

        if (User.IsInRole(Roles.Customer) && !IsCurrentCustomerOwner(appointment))
        {
            return Forbid();
        }

        if (appointment.Status is AppointmentStatuses.Completed or AppointmentStatuses.Cancelled)
        {
            return BadRequest(new { message = "Only pending or confirmed bookings can be rescheduled." });
        }

        var nowDate = DateOnly.FromDateTime(DateTime.UtcNow.Date);
        if (request.AppointmentDate < nowDate)
        {
            return BadRequest(new { message = "Appointment date cannot be in the past." });
        }

        var timeSlot = NormalizeTimeSlot(request.TimeSlot);
        if (string.IsNullOrWhiteSpace(timeSlot))
        {
            return BadRequest(new { message = "Time slot is required." });
        }

        var therapistAvailable = await context.Therapists
            .AsNoTracking()
            .AnyAsync(t => t.Id == appointment.TherapistId && t.IsAvailable);

        if (!therapistAvailable)
        {
            return BadRequest(new { message = "Assigned therapist is currently unavailable. Contact spa support." });
        }

        var serviceDuration = await context.Services
            .AsNoTracking()
            .Where(service => service.Id == appointment.ServiceId)
            .Select(service => service.DurationMinutes)
            .FirstOrDefaultAsync();

        if (serviceDuration is < 15 or > 240)
        {
            return BadRequest(new { message = "Service duration is invalid. Contact spa support." });
        }

        var hasConflict = await HasTherapistTimeConflictAsync(
            appointment.TherapistId,
            request.AppointmentDate,
            timeSlot,
            serviceDuration,
            appointment.Id);

        if (hasConflict)
        {
            return BadRequest(new { message = "Selected therapist is already booked for that date and time range." });
        }

        var previousStatus = appointment.Status;
        appointment.AppointmentDate = request.AppointmentDate;
        appointment.TimeSlot = timeSlot;
        appointment.Status = AppointmentStatuses.Pending;
        appointment.UpdatedAtUtc = DateTime.UtcNow;

        await context.SaveChangesAsync();

        if (!string.Equals(previousStatus, appointment.Status, StringComparison.Ordinal))
        {
            await NotifyCustomerOfStatusUpdateAsync(appointment);
        }

        await NotifyAdminsOfRescheduleRequestAsync(appointment);

        var mapped = await BuildAppointmentQuery().FirstAsync(a => a.Id == id);
        return Ok(ToDto(mapped));
    }

    [HttpPatch("{id:int}/cancel")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.Customer}")]
    public async Task<ActionResult<AppointmentDto>> Cancel(int id)
    {
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appointment is null)
        {
            return NotFound();
        }

        if (User.IsInRole(Roles.Customer) && !IsCurrentCustomerOwner(appointment))
        {
            return Forbid();
        }

        if (appointment.Status == AppointmentStatuses.Completed)
        {
            return BadRequest(new { message = "Completed appointments cannot be cancelled." });
        }

        if (appointment.AppointmentDate < DateOnly.FromDateTime(DateTime.UtcNow.Date))
        {
            return BadRequest(new { message = "Past appointments cannot be cancelled." });
        }

        if (appointment.Status != AppointmentStatuses.Cancelled)
        {
            appointment.Status = AppointmentStatuses.Cancelled;
            appointment.UpdatedAtUtc = DateTime.UtcNow;
            await context.SaveChangesAsync();
            await NotifyCustomerOfStatusUpdateAsync(appointment);
            await NotifyStaffOfCancellationAsync(appointment);
        }

        var mapped = await BuildAppointmentQuery().FirstAsync(a => a.Id == id);
        return Ok(ToDto(mapped));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var appointment = await context.Appointments.FirstOrDefaultAsync(a => a.Id == id);
        if (appointment is null)
        {
            return NotFound();
        }

        context.Appointments.Remove(appointment);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private IQueryable<Appointment> BuildAppointmentQuery() =>
        context.Appointments
            .AsNoTracking()
            .Include(a => a.Service)
            .Include(a => a.Therapist);

    private static AppointmentDto ToDto(Appointment appointment) =>
        new()
        {
            Id = appointment.Id,
            ServiceId = appointment.ServiceId,
            ServiceName = appointment.Service?.Name ?? string.Empty,
            TherapistId = appointment.TherapistId,
            TherapistName = appointment.Therapist?.Name ?? string.Empty,
            CustomerUserId = appointment.CustomerUserId,
            CustomerName = appointment.CustomerName,
            CustomerEmail = appointment.CustomerEmail,
            CustomerPhone = appointment.CustomerPhone,
            AppointmentDate = appointment.AppointmentDate,
            TimeSlot = appointment.TimeSlot,
            Allergies = appointment.Allergies,
            HealthConcerns = appointment.HealthConcerns,
            Status = appointment.Status,
            CreatedAtUtc = appointment.CreatedAtUtc,
            UpdatedAtUtc = appointment.UpdatedAtUtc
        };

    private static string? NormalizeStatus(string status) =>
        AppointmentStatuses.All.FirstOrDefault(s => string.Equals(s, status, StringComparison.OrdinalIgnoreCase));

    private static string NormalizeTimeSlot(string timeSlot)
    {
        var trimmed = timeSlot.Trim();
        if (string.IsNullOrWhiteSpace(trimmed))
        {
            return string.Empty;
        }

        return string.Join(' ', trimmed.Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    private static string? NormalizeOptional(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static bool TryNormalizeOptionalEmail(string? value, out string? normalized)
    {
        normalized = null;

        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        var trimmed = value.Trim().ToLowerInvariant();

        try
        {
            _ = new MailAddress(trimmed);
            normalized = trimmed;
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static (TimeOnly Start, TimeOnly End) ResolveBusinessHours(DateOnly appointmentDate)
    {
        var dayOfWeek = appointmentDate.DayOfWeek;
        return dayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
            ? (new TimeOnly(10, 0), new TimeOnly(18, 0))
            : (new TimeOnly(9, 0), new TimeOnly(20, 0));
    }

    private async Task<List<(TimeOnly Start, TimeOnly End)>> LoadTherapistDayRangesAsync(
        int therapistId,
        DateOnly appointmentDate,
        int? excludeAppointmentId = null)
    {
        var query = context.Appointments
            .AsNoTracking()
            .Include(appointment => appointment.Service)
            .Where(appointment =>
                appointment.TherapistId == therapistId &&
                appointment.AppointmentDate == appointmentDate &&
                appointment.Status != AppointmentStatuses.Cancelled);

        if (excludeAppointmentId.HasValue)
        {
            query = query.Where(appointment => appointment.Id != excludeAppointmentId.Value);
        }

        var appointments = await query.ToListAsync();
        var ranges = new List<(TimeOnly Start, TimeOnly End)>(appointments.Count);

        foreach (var appointment in appointments)
        {
            var durationMinutes = appointment.Service?.DurationMinutes ?? 60;
            if (TryGetRangeFromSlot(appointment.TimeSlot, durationMinutes, out var start, out var end))
            {
                ranges.Add((start, end));
            }
        }

        return ranges;
    }

    private static List<string> BuildAvailableSlots(
        TimeOnly businessStart,
        TimeOnly businessEnd,
        int durationMinutes,
        IReadOnlyCollection<(TimeOnly Start, TimeOnly End)> busyRanges)
    {
        var slots = new List<string>();
        for (var start = businessStart; start.AddMinutes(durationMinutes) <= businessEnd; start = start.AddMinutes(SlotIntervalMinutes))
        {
            var end = start.AddMinutes(durationMinutes);
            var hasConflict = busyRanges.Any(range => Overlaps(start, end, range.Start, range.End));
            if (!hasConflict)
            {
                slots.Add(FormatSlot(start, end));
            }
        }

        return slots;
    }

    private static bool TryGetRangeFromSlot(
        string timeSlot,
        int fallbackDurationMinutes,
        out TimeOnly start,
        out TimeOnly end)
    {
        start = default;
        end = default;

        var normalized = NormalizeTimeSlot(timeSlot);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return false;
        }

        var parts = normalized.Split('-', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 2 &&
            TryParseClock(parts[0], out start) &&
            TryParseClock(parts[1], out end))
        {
            return end > start;
        }

        if (!TryParseClock(normalized, out start))
        {
            return false;
        }

        var safeDurationMinutes = fallbackDurationMinutes is >= 15 and <= 240
            ? fallbackDurationMinutes
            : 60;
        end = start.AddMinutes(safeDurationMinutes);
        return true;
    }

    private static bool TryParseClock(string raw, out TimeOnly value)
    {
        var normalized = raw.Trim();

        if (TimeOnly.TryParseExact(
                normalized,
                ClockFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out value))
        {
            return true;
        }

        return TimeOnly.TryParse(
            normalized,
            CultureInfo.GetCultureInfo("en-US"),
            DateTimeStyles.AllowWhiteSpaces,
            out value);
    }

    private static string FormatSlot(TimeOnly start, TimeOnly end) =>
        $"{start.ToString("hh:mm tt", CultureInfo.InvariantCulture)} - {end.ToString("hh:mm tt", CultureInfo.InvariantCulture)}";

    private static bool Overlaps(TimeOnly startA, TimeOnly endA, TimeOnly startB, TimeOnly endB) =>
        startA < endB && endA > startB;

    private async Task<bool> HasTherapistTimeConflictAsync(
        int therapistId,
        DateOnly appointmentDate,
        string timeSlot,
        int durationMinutes,
        int? excludeAppointmentId = null)
    {
        if (!TryGetRangeFromSlot(timeSlot, durationMinutes, out var requestStart, out var requestEnd))
        {
            var normalizedSlot = timeSlot.ToLowerInvariant();
            var fallbackQuery = context.Appointments
                .AsNoTracking()
                .Where(appointment =>
                    appointment.TherapistId == therapistId &&
                    appointment.AppointmentDate == appointmentDate &&
                    appointment.Status != AppointmentStatuses.Cancelled);

            if (excludeAppointmentId.HasValue)
            {
                fallbackQuery = fallbackQuery.Where(appointment => appointment.Id != excludeAppointmentId.Value);
            }

            return await fallbackQuery.AnyAsync(appointment => appointment.TimeSlot.ToLower() == normalizedSlot);
        }

        var existingRanges = await LoadTherapistDayRangesAsync(therapistId, appointmentDate, excludeAppointmentId);
        return existingRanges.Any(range => Overlaps(requestStart, requestEnd, range.Start, range.End));
    }

    private async Task<bool> IsCurrentStaffAssignedAsync(int therapistId)
    {
        var userId = GetCurrentUserId();
        var staffName = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;
        if (string.IsNullOrWhiteSpace(staffName))
        {
            return false;
        }

        var therapist = await context.Therapists
            .AsNoTracking()
            .Where(t => t.Id == therapistId)
            .Select(t => new { t.Name, t.UserId })
            .FirstOrDefaultAsync();

        if (therapist is null)
        {
            return false;
        }

        if (userId.HasValue && therapist.UserId.HasValue)
        {
            return therapist.UserId.Value == userId.Value;
        }

        return therapist.UserId is null &&
               string.Equals(therapist.Name, staffName, StringComparison.OrdinalIgnoreCase);
    }

    private bool IsCurrentCustomerOwner(Appointment appointment)
    {
        var userId = GetCurrentUserId();
        if (userId.HasValue && appointment.CustomerUserId.HasValue)
        {
            return appointment.CustomerUserId.Value == userId.Value;
        }

        var customerName = User.FindFirstValue(ClaimTypes.Name);
        return appointment.CustomerUserId is null &&
               !string.IsNullOrWhiteSpace(customerName) &&
               string.Equals(appointment.CustomerName, customerName, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<List<int>> ResolveCurrentStaffTherapistIdsAsync()
    {
        var userId = GetCurrentUserId();
        var staffName = User.FindFirstValue(ClaimTypes.Name) ?? string.Empty;

        return await context.Therapists
            .AsNoTracking()
            .Where(t =>
                (userId.HasValue && t.UserId == userId.Value) ||
                (t.UserId == null && t.Name == staffName))
            .Select(t => t.Id)
            .ToListAsync();
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private async Task NotifyAdminsOfNewBookingAsync(Appointment appointment)
    {
        var subject = $"New booking request #{appointment.Id}";
        var body =
            $"Customer: {appointment.CustomerName}\n" +
            $"Email: {appointment.CustomerEmail}\n" +
            $"Phone: {appointment.CustomerPhone}\n" +
            $"Date: {appointment.AppointmentDate:yyyy-MM-dd}\n" +
            $"Time: {appointment.TimeSlot}\n" +
            $"Status: {appointment.Status}";

        await NotifyAdminsAsync(subject, body, NotificationTypes.Alert, nameof(Appointment), appointment.Id);
    }

    private async Task NotifyAdminsOfRescheduleRequestAsync(Appointment appointment)
    {
        var subject = $"Booking #{appointment.Id} was rescheduled";
        var body =
            $"Customer: {appointment.CustomerName}\n" +
            $"Email: {appointment.CustomerEmail}\n" +
            $"New Date: {appointment.AppointmentDate:yyyy-MM-dd}\n" +
            $"New Time: {appointment.TimeSlot}\n" +
            $"Current Status: {appointment.Status}";

        await NotifyAdminsAsync(subject, body, NotificationTypes.Warning, nameof(Appointment), appointment.Id);
    }

    private async Task NotifyAdminsAsync(
        string subject,
        string body,
        string notificationType,
        string entityType,
        int entityId)
    {
        var admins = await context.Users
            .AsNoTracking()
            .Where(user => user.Role == Roles.Admin)
            .Select(user => new { user.Id, user.FullName, user.Email })
            .ToListAsync();

        foreach (var admin in admins)
        {
            await emailService.SendAsync(admin.FullName, admin.Email, subject, body);
            await notificationService.CreateForUserAsync(
                admin.Id,
                subject,
                body,
                notificationType,
                entityType,
                entityId);
        }
    }

    private async Task NotifyStaffOfAssignmentAsync(Appointment appointment)
    {
        var staffRecipient = await context.Therapists
            .AsNoTracking()
            .Where(therapist => therapist.Id == appointment.TherapistId && therapist.UserId != null)
            .Select(therapist => new
            {
                therapist.Name,
                therapist.UserId,
                StaffName = therapist.User != null ? therapist.User.FullName : null,
                StaffEmail = therapist.User != null ? therapist.User.Email : null
            })
            .FirstOrDefaultAsync();

        if (staffRecipient is null || string.IsNullOrWhiteSpace(staffRecipient.StaffEmail))
        {
            return;
        }

        var subject = $"New booking assigned to you (#{appointment.Id})";
        var body =
            $"You have been assigned a booking.\n\n" +
            $"Customer: {appointment.CustomerName}\n" +
            $"Date: {appointment.AppointmentDate:yyyy-MM-dd}\n" +
            $"Time: {appointment.TimeSlot}\n" +
            $"Status: {appointment.Status}";

        await emailService.SendAsync(
            staffRecipient.StaffName ?? staffRecipient.Name,
            staffRecipient.StaffEmail,
            subject,
            body);

        if (staffRecipient.UserId.HasValue)
        {
            await notificationService.CreateForUserAsync(
                staffRecipient.UserId.Value,
                subject,
                body,
                NotificationTypes.Alert,
                nameof(Appointment),
                appointment.Id);
        }
    }

    private async Task NotifyStaffOfCancellationAsync(Appointment appointment)
    {
        var staffRecipient = await context.Therapists
            .AsNoTracking()
            .Where(therapist => therapist.Id == appointment.TherapistId && therapist.UserId != null)
            .Select(therapist => new
            {
                therapist.Name,
                therapist.UserId,
                StaffName = therapist.User != null ? therapist.User.FullName : null,
                StaffEmail = therapist.User != null ? therapist.User.Email : null
            })
            .FirstOrDefaultAsync();

        if (staffRecipient is null || string.IsNullOrWhiteSpace(staffRecipient.StaffEmail))
        {
            return;
        }

        var subject = $"Booking cancelled (#{appointment.Id})";
        var body =
            $"A booking assigned to you was cancelled.\n\n" +
            $"Customer: {appointment.CustomerName}\n" +
            $"Date: {appointment.AppointmentDate:yyyy-MM-dd}\n" +
            $"Time: {appointment.TimeSlot}";

        await emailService.SendAsync(
            staffRecipient.StaffName ?? staffRecipient.Name,
            staffRecipient.StaffEmail,
            subject,
            body);

        if (staffRecipient.UserId.HasValue)
        {
            await notificationService.CreateForUserAsync(
                staffRecipient.UserId.Value,
                subject,
                body,
                NotificationTypes.Warning,
                nameof(Appointment),
                appointment.Id);
        }
    }

    private async Task NotifyCustomerOfStatusUpdateAsync(Appointment appointment)
    {
        var email = appointment.CustomerEmail;

        if (string.IsNullOrWhiteSpace(email) && appointment.CustomerUserId.HasValue)
        {
            email = await context.Users
                .AsNoTracking()
                .Where(user => user.Id == appointment.CustomerUserId.Value)
                .Select(user => user.Email)
                .FirstOrDefaultAsync();
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        var subject = $"Your Love Spa booking #{appointment.Id} is now {appointment.Status}";
        var body =
            $"Hello {appointment.CustomerName},\n\n" +
            $"Your booking status has been updated.\n\n" +
            $"Date: {appointment.AppointmentDate:yyyy-MM-dd}\n" +
            $"Time: {appointment.TimeSlot}\n" +
            $"Status: {appointment.Status}\n\n" +
            "If you need any changes, please contact Love Spa & Wellness.";

        await emailService.SendAsync(appointment.CustomerName, email, subject, body);

        if (appointment.CustomerUserId.HasValue)
        {
            var notificationType = appointment.Status == AppointmentStatuses.Cancelled
                ? NotificationTypes.Warning
                : NotificationTypes.Info;

            await notificationService.CreateForUserAsync(
                appointment.CustomerUserId.Value,
                subject,
                body,
                notificationType,
                nameof(Appointment),
                appointment.Id);
        }
    }
}
