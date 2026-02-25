using LoveSpaBackend.Common;
using LoveSpaBackend.Controllers;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Auth;
using LoveSpaBackend.Models;
using LoveSpaBackend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace LoveSpaBackend.Tests;

public class UsersControllerTests
{
    [Fact]
    public async Task Register_ReturnsConflict_WhenEmailAlreadyExists()
    {
        await using var context = CreateContext();
        context.Users.Add(new User
        {
            FullName = "Existing User",
            Email = "existing@lovespa.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
            Role = Roles.Customer
        });
        await context.SaveChangesAsync();

        var controller = new UsersController(
            context,
            new FakeJwtTokenService(),
            new FakeHostEnvironment(),
            CreateConfiguration(),
            new FakeInquiryEmailService());

        var result = await controller.Register(new RegisterRequestDto
        {
            FullName = "Jane Customer",
            Email = "Existing@LoveSpa.com",
            Password = "StrongPass123!"
        });

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task Register_CreatesCustomerAndReturnsToken_WhenRequestIsValid()
    {
        await using var context = CreateContext();
        var controller = new UsersController(
            context,
            new FakeJwtTokenService(),
            new FakeHostEnvironment(),
            CreateConfiguration(),
            new FakeInquiryEmailService());

        var result = await controller.Register(new RegisterRequestDto
        {
            FullName = "Jane Customer",
            Email = "Jane@LoveSpa.com",
            Password = "StrongPass123!"
        });

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<AuthResponseDto>(okResult.Value);

        Assert.Equal("token-for-jane@lovespa.com", payload.Token);

        var createdUser = await context.Users.SingleAsync();
        Assert.Equal("jane@lovespa.com", createdUser.Email);
        Assert.Equal(Roles.Customer, createdUser.Role);
        Assert.NotEqual("StrongPass123!", createdUser.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("StrongPass123!", createdUser.PasswordHash));
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenPasswordIsIncorrect()
    {
        await using var context = CreateContext();
        context.Users.Add(new User
        {
            FullName = "Jane Customer",
            Email = "jane@lovespa.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123!"),
            Role = Roles.Customer
        });
        await context.SaveChangesAsync();

        var controller = new UsersController(
            context,
            new FakeJwtTokenService(),
            new FakeHostEnvironment(),
            CreateConfiguration(),
            new FakeInquiryEmailService());

        var result = await controller.Login(new LoginRequestDto
        {
            Email = "jane@lovespa.com",
            Password = "WrongPassword123!"
        });

        Assert.IsType<UnauthorizedObjectResult>(result.Result);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsGenericMessage_AndStoresTokenForExistingUser()
    {
        await using var context = CreateContext();
        context.Users.Add(new User
        {
            FullName = "Jane Customer",
            Email = "jane@lovespa.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("StrongPass123!"),
            Role = Roles.Customer
        });
        await context.SaveChangesAsync();

        var controller = new UsersController(
            context,
            new FakeJwtTokenService(),
            new FakeHostEnvironment(),
            CreateConfiguration(),
            new FakeInquiryEmailService());

        var result = await controller.ForgotPassword(new ForgotPasswordRequestDto
        {
            Email = "jane@lovespa.com"
        });

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<ForgotPasswordResponseDto>(okResult.Value);
        Assert.Equal(
            "If an account with that email exists, password reset instructions have been issued.",
            payload.Message);
        Assert.False(string.IsNullOrWhiteSpace(payload.ResetToken));
        Assert.Single(context.PasswordResetTokens);
    }

    [Fact]
    public async Task ResetPassword_UpdatesPassword_WhenTokenIsValid()
    {
        await using var context = CreateContext();
        var user = new User
        {
            FullName = "Jane Customer",
            Email = "jane@lovespa.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("OldPassword123!"),
            Role = Roles.Customer
        };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var controller = new UsersController(
            context,
            new FakeJwtTokenService(),
            new FakeHostEnvironment(),
            CreateConfiguration(),
            new FakeInquiryEmailService());
        var forgot = await controller.ForgotPassword(new ForgotPasswordRequestDto { Email = "jane@lovespa.com" });
        var forgotPayload = Assert.IsType<ForgotPasswordResponseDto>(Assert.IsType<OkObjectResult>(forgot.Result).Value);
        Assert.NotNull(forgotPayload.ResetToken);

        var resetResult = await controller.ResetPassword(new ResetPasswordRequestDto
        {
            Token = forgotPayload.ResetToken!,
            NewPassword = "NewPassword123!"
        });

        Assert.IsType<OkObjectResult>(resetResult);
        var updatedUser = await context.Users.FirstAsync(u => u.Email == "jane@lovespa.com");
        Assert.True(BCrypt.Net.BCrypt.Verify("NewPassword123!", updatedUser.PasswordHash));
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static IConfiguration CreateConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["App:FrontendBaseUrl"] = "http://localhost:4200"
            })
            .Build();

    private sealed class FakeJwtTokenService : IJwtTokenService
    {
        public AuthResponseDto CreateToken(User user) =>
            new()
            {
                Token = $"token-for-{user.Email}",
                ExpiresAtUtc = DateTime.UtcNow.AddHours(1),
                User = new UserProfileDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    Role = user.Role
                }
            };
    }

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "LoveSpaBackend.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }

    private sealed class FakeInquiryEmailService : IInquiryEmailService
    {
        public Task<InquiryEmailSendResult> SendAsync(string toName, string toEmail, string subject, string body) =>
            Task.FromResult(new InquiryEmailSendResult(true, "Test email sent."));
    }
}
