using LoveSpaBackend.Controllers;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Inquiries;
using LoveSpaBackend.DTOs.Notifications;
using LoveSpaBackend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Tests;

public class InquiriesControllerTests
{
    [Fact]
    public async Task Create_PersistsInquiry_AndReturnsCreatedResult()
    {
        await using var context = CreateContext();
        var controller = new InquiriesController(
            context,
            new FakeInquiryEmailService(),
            new FakeNotificationService());

        var result = await controller.Create(new CreateInquiryDto
        {
            FullName = "Jane Guest",
            Email = "jane@example.com",
            Phone = "+263 789 000 000",
            Message = "I would like to ask about couples sessions next weekend."
        });

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<InquiryDto>(created.Value);

        Assert.Equal("Jane Guest", payload.FullName);
        Assert.Equal("jane@example.com", payload.Email);

        var count = await context.Inquiries.CountAsync();
        Assert.Equal(1, count);
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
