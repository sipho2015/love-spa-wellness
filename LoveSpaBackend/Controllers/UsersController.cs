using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Auth;
using LoveSpaBackend.Models;
using LoveSpaBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(
    ApplicationDbContext context,
    IJwtTokenService jwtTokenService,
    IHostEnvironment hostEnvironment,
    IConfiguration configuration,
    IInquiryEmailService inquiryEmailService) : ControllerBase
{
    private const int PasswordResetExpiryMinutes = 30;
    private const string GenericResetMessage =
        "If an account with that email exists, password reset instructions have been issued.";

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterRequestDto request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await context.Users.AnyAsync(u => u.Email == normalizedEmail))
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = Roles.Customer
        };

        context.Users.Add(user);
        await context.SaveChangesAsync();

        return Ok(jwtTokenService.CreateToken(user));
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<ActionResult<ForgotPasswordResponseDto>> ForgotPassword(ForgotPasswordRequestDto request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        string? rawToken = null;

        if (user is not null)
        {
            var now = DateTime.UtcNow;

            var activeTokens = await context.PasswordResetTokens
                .Where(t => t.UserId == user.Id && t.UsedAtUtc == null && t.ExpiresAtUtc > now)
                .ToListAsync();

            foreach (var activeToken in activeTokens)
            {
                activeToken.UsedAtUtc = now;
            }

            rawToken = CreateRawToken();
            var tokenHash = ComputeTokenHash(rawToken);

            context.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId = user.Id,
                TokenHash = tokenHash,
                CreatedAtUtc = now,
                ExpiresAtUtc = now.AddMinutes(PasswordResetExpiryMinutes)
            });

            await context.SaveChangesAsync();

            if (!string.IsNullOrWhiteSpace(rawToken))
            {
                await SendPasswordResetEmailAsync(user, rawToken);
            }
        }

        return Ok(new ForgotPasswordResponseDto
        {
            Message = GenericResetMessage,
            ResetToken = hostEnvironment.IsDevelopment() ? rawToken : null
        });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequestDto request)
    {
        var tokenHash = ComputeTokenHash(request.Token.Trim());
        var now = DateTime.UtcNow;

        var token = await context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

        if (token is null || token.UsedAtUtc != null || token.ExpiresAtUtc <= now || token.User is null)
        {
            return BadRequest(new { message = "The reset token is invalid or expired." });
        }

        token.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        token.UsedAtUtc = now;

        var otherTokens = await context.PasswordResetTokens
            .Where(t => t.UserId == token.UserId && t.Id != token.Id && t.UsedAtUtc == null)
            .ToListAsync();

        foreach (var other in otherTokens)
        {
            other.UsedAtUtc = now;
        }

        await context.SaveChangesAsync();

        return Ok(new { message = "Password reset successful. Please log in." });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginRequestDto request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        return Ok(jwtTokenService.CreateToken(user));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> Me()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null)
        {
            return NotFound();
        }

        return Ok(ToProfileDto(user));
    }

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IEnumerable<UserProfileDto>>> GetUsers()
    {
        var users = await context.Users
            .AsNoTracking()
            .OrderBy(u => u.FullName)
            .Select(u => ToProfileDto(u))
            .ToListAsync();

        return Ok(users);
    }

    private static UserProfileDto ToProfileDto(User user) =>
        new()
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role
        };

    private static string CreateRawToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToHexString(bytes);
    }

    private static string ComputeTokenHash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }

    private async Task SendPasswordResetEmailAsync(User user, string rawToken)
    {
        var frontendBaseUrl = configuration["App:FrontendBaseUrl"]?.TrimEnd('/');
        var resetEntryPoint = string.IsNullOrWhiteSpace(frontendBaseUrl)
            ? "Open login and choose Forgot Password"
            : $"{frontendBaseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";

        var subject = "Love Spa & Wellness password reset";
        var body =
            $"Hi {user.FullName},\n\n" +
            "We received a password reset request for your account.\n" +
            $"This token expires in {PasswordResetExpiryMinutes} minutes.\n" +
            $"Reset link: {resetEntryPoint}\n\n" +
            $"Reset token: {rawToken}\n\n" +
            "If you did not request this, you can ignore this email.";

        await inquiryEmailService.SendAsync(user.FullName, user.Email, subject, body);
    }
}
