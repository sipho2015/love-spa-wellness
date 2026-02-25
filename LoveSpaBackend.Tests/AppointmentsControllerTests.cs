using System.Security.Claims;
using LoveSpaBackend.Common;
using LoveSpaBackend.Controllers;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Appointments;
using LoveSpaBackend.DTOs.Notifications;
using LoveSpaBackend.Models;
using LoveSpaBackend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Tests;

public class AppointmentsControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenTherapistSlotAlreadyBooked()
    {
        await using var context = CreateContext();
        var service = new SpaService
        {
            Name = "Swedish",
            Description = "Relax",
            DurationMinutes = 60,
            Price = 80m,
            IsActive = true
        };
        var therapist = new Therapist
        {
            Name = "Emma Brown",
            Specialty = "Massage",
            IsAvailable = true
        };

        context.Services.Add(service);
        context.Therapists.Add(therapist);
        await context.SaveChangesAsync();

        context.Appointments.Add(new Appointment
        {
            ServiceId = service.Id,
            TherapistId = therapist.Id,
            CustomerName = "Jane",
            CustomerEmail = "jane@example.com",
            CustomerPhone = "+1 555 100 1000",
            AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1).Date),
            TimeSlot = "10:00 AM - 11:00 AM",
            Status = AppointmentStatuses.Pending
        });
        await context.SaveChangesAsync();

        var controller = new AppointmentsController(
            context,
            new FakeInquiryEmailService(),
            new FakeNotificationService());
        var result = await controller.Create(new CreateAppointmentDto
        {
            ServiceId = service.Id,
            TherapistId = therapist.Id,
            CustomerName = "Guest",
            CustomerEmail = "guest@example.com",
            CustomerPhone = "+1 555 200 2000",
            AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1).Date),
            TimeSlot = "10:00 AM - 11:00 AM"
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetMyBookings_FiltersByCustomerUserId()
    {
        await using var context = CreateContext();
        var service = new SpaService
        {
            Name = "Deep Tissue",
            Description = "Recovery",
            DurationMinutes = 75,
            Price = 120m,
            IsActive = true
        };
        var therapist = new Therapist
        {
            Name = "Liam Patel",
            Specialty = "Deep Tissue",
            IsAvailable = true
        };

        context.Services.Add(service);
        context.Therapists.Add(therapist);
        await context.SaveChangesAsync();

        context.Appointments.AddRange(
            new Appointment
            {
                ServiceId = service.Id,
                TherapistId = therapist.Id,
                CustomerUserId = 101,
                CustomerName = "Customer One",
                CustomerEmail = "one@example.com",
                CustomerPhone = "+1 555 100 1000",
                AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2).Date),
                TimeSlot = "10:00 AM",
                Status = AppointmentStatuses.Pending
            },
            new Appointment
            {
                ServiceId = service.Id,
                TherapistId = therapist.Id,
                CustomerUserId = 202,
                CustomerName = "Customer Two",
                CustomerEmail = "two@example.com",
                CustomerPhone = "+1 555 200 2000",
                AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3).Date),
                TimeSlot = "2:00 PM",
                Status = AppointmentStatuses.Pending
            });
        await context.SaveChangesAsync();

        var controller = new AppointmentsController(
            context,
            new FakeInquiryEmailService(),
            new FakeNotificationService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = BuildPrincipal(101, Roles.Customer, "Customer One", "one@example.com")
                }
            }
        };

        var result = await controller.GetMyBookings();
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IEnumerable<AppointmentDto>>(ok.Value).ToList();

        Assert.Single(payload);
        Assert.Equal(101, payload[0].CustomerUserId);
    }

    [Fact]
    public async Task Cancel_UpdatesStatusToCancelled()
    {
        await using var context = CreateContext();
        var service = new SpaService
        {
            Name = "Glow Facial",
            Description = "Hydration",
            DurationMinutes = 45,
            Price = 90m,
            IsActive = true
        };
        var therapist = new Therapist
        {
            Name = "Sophia Nguyen",
            Specialty = "Facial",
            IsAvailable = true
        };

        context.Services.Add(service);
        context.Therapists.Add(therapist);
        await context.SaveChangesAsync();

        var appointment = new Appointment
        {
            ServiceId = service.Id,
            TherapistId = therapist.Id,
            CustomerUserId = 301,
            CustomerName = "Customer Three",
            CustomerEmail = "three@example.com",
            CustomerPhone = "+1 555 300 3000",
            AppointmentDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2).Date),
            TimeSlot = "4:00 PM",
            Status = AppointmentStatuses.Confirmed
        };
        context.Appointments.Add(appointment);
        await context.SaveChangesAsync();

        var controller = new AppointmentsController(
            context,
            new FakeInquiryEmailService(),
            new FakeNotificationService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = BuildPrincipal(301, Roles.Customer, "Customer Three", "three@example.com")
                }
            }
        };

        var result = await controller.Cancel(appointment.Id);
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<AppointmentDto>(ok.Value);

        Assert.Equal(AppointmentStatuses.Cancelled, payload.Status);
    }

    private static ClaimsPrincipal BuildPrincipal(int userId, string role, string fullName, string email)
    {
        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, fullName),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role)
        ], "TestAuth");

        return new ClaimsPrincipal(identity);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private sealed class FakeInquiryEmailService : IInquiryEmailService
    {
        public Task<InquiryEmailSendResult> SendAsync(string toName, string toEmail, string subject, string body) =>
            Task.FromResult(new InquiryEmailSendResult(true, "Test email sent."));
    }

    private sealed class FakeNotificationService : INotificationService
    {
        public Task CreateAsync(CreateNotificationDto request) => Task.CompletedTask;

        public Task CreateForRoleAsync(string role, string title, string message, string type = "Info", string? entityType = null, int? entityId = null) =>
            Task.CompletedTask;

        public Task CreateForUserAsync(int userId, string title, string message, string type = "Info", string? entityType = null, int? entityId = null) =>
            Task.CompletedTask;
    }
}
