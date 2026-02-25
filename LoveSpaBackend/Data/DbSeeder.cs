using LoveSpaBackend.Common;
using LoveSpaBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        var context = serviceProvider.GetRequiredService<ApplicationDbContext>();

        await EnsureDefaultUsersAsync(context);

        if (!await context.Services.AnyAsync())
        {
            context.Services.AddRange(
                new SpaService
                {
                    Name = "Swedish Relaxation Massage",
                    Description = "A gentle full-body massage designed to release tension and promote calm.",
                    DurationMinutes = 60,
                    Price = 89.00m,
                    IsActive = true
                },
                new SpaService
                {
                    Name = "Deep Tissue Therapy",
                    Description = "Focused pressure therapy for chronic muscle tightness and recovery.",
                    DurationMinutes = 75,
                    Price = 119.00m,
                    IsActive = true
                },
                new SpaService
                {
                    Name = "Glow Facial Treatment",
                    Description = "Hydrating facial treatment for refreshed, bright and healthy skin.",
                    DurationMinutes = 45,
                    Price = 79.00m,
                    IsActive = true
                }
            );
        }

        await EnsureDefaultTherapistsAsync(context);

        await context.SaveChangesAsync();

        await LinkTherapistsToStaffUsersAsync(context);
        await context.SaveChangesAsync();

        if (!await context.Packages.AnyAsync())
        {
            var servicesByName = await context.Services
                .AsNoTracking()
                .ToDictionaryAsync(s => s.Name, s => s);

            if (servicesByName.TryGetValue("Swedish Relaxation Massage", out var swedish) &&
                servicesByName.TryGetValue("Deep Tissue Therapy", out var deepTissue) &&
                servicesByName.TryGetValue("Glow Facial Treatment", out var facial))
            {
                context.Packages.AddRange(
                    new SpaPackage
                    {
                        Name = "Serenity Escape Package",
                        Description = "A calming two-step ritual with full-body relaxation massage and glow facial care.",
                        DurationMinutes = 105,
                        OriginalPrice = 168.00m,
                        PackagePrice = 149.00m,
                        ImageUrl =
                            "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
                        IsActive = true,
                        PackageServices =
                        [
                            new PackageService { ServiceId = swedish.Id, DisplayOrder = 1 },
                            new PackageService { ServiceId = facial.Id, DisplayOrder = 2 }
                        ]
                    },
                    new SpaPackage
                    {
                        Name = "Recovery Renewal Package",
                        Description = "Targeted deep tissue recovery followed by gentle Swedish relaxation for total reset.",
                        DurationMinutes = 135,
                        OriginalPrice = 208.00m,
                        PackagePrice = 179.00m,
                        ImageUrl =
                            "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=900&q=80",
                        IsActive = true,
                        PackageServices =
                        [
                            new PackageService { ServiceId = deepTissue.Id, DisplayOrder = 1 },
                            new PackageService { ServiceId = swedish.Id, DisplayOrder = 2 }
                        ]
                    },
                    new SpaPackage
                    {
                        Name = "Complete Wellness Ritual",
                        Description = "A signature three-service wellness journey for deep relief, skin glow, and calm.",
                        DurationMinutes = 180,
                        OriginalPrice = 287.00m,
                        PackagePrice = 239.00m,
                        ImageUrl =
                            "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=900&q=80",
                        IsActive = true,
                        PackageServices =
                        [
                            new PackageService { ServiceId = deepTissue.Id, DisplayOrder = 1 },
                            new PackageService { ServiceId = facial.Id, DisplayOrder = 2 },
                            new PackageService { ServiceId = swedish.Id, DisplayOrder = 3 }
                        ]
                    }
                );
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureDefaultUsersAsync(ApplicationDbContext context)
    {
        var defaultUsers = new[]
        {
            new
            {
                FullName = "System Administrator",
                Email = "admin@lovespa.com",
                Password = "Admin@123",
                Role = Roles.Admin
            },
            new
            {
                FullName = "Emma Brown",
                Email = "staff@lovespa.com",
                Password = "Staff@123",
                Role = Roles.Staff
            },
            new
            {
                FullName = "Sophia Nguyen",
                Email = "staff.sophia@lovespa.com",
                Password = "Staff@123",
                Role = Roles.Staff
            },
            new
            {
                FullName = "Liam Patel",
                Email = "staff.liam@lovespa.com",
                Password = "Staff@123",
                Role = Roles.Staff
            },
            new
            {
                FullName = "Jane Customer",
                Email = "customer@lovespa.com",
                Password = "Customer@123",
                Role = Roles.Customer
            }
        };

        foreach (var seedUser in defaultUsers)
        {
            var normalizedEmail = seedUser.Email.ToLowerInvariant();
            var exists = await context.Users.AnyAsync(u => u.Email == normalizedEmail);
            if (exists)
            {
                continue;
            }

            context.Users.Add(new User
            {
                FullName = seedUser.FullName,
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedUser.Password),
                Role = seedUser.Role
            });
        }

        await context.SaveChangesAsync();
    }

    private static async Task EnsureDefaultTherapistsAsync(ApplicationDbContext context)
    {
        var defaultTherapists = new[]
        {
            new { Name = "Emma Brown", Specialty = "Massage Therapy", IsAvailable = true },
            new { Name = "Sophia Nguyen", Specialty = "Facial & Skin Care", IsAvailable = true },
            new { Name = "Liam Patel", Specialty = "Deep Tissue & Sports Recovery", IsAvailable = true }
        };

        foreach (var therapist in defaultTherapists)
        {
            var exists = await context.Therapists.AnyAsync(t => t.Name == therapist.Name);
            if (exists)
            {
                continue;
            }

            context.Therapists.Add(new Therapist
            {
                Name = therapist.Name,
                Specialty = therapist.Specialty,
                IsAvailable = therapist.IsAvailable
            });
        }
    }

    private static async Task LinkTherapistsToStaffUsersAsync(ApplicationDbContext context)
    {
        var staffUsersByName = await context.Users
            .AsNoTracking()
            .Where(u => u.Role == Roles.Staff)
            .ToDictionaryAsync(u => u.FullName, u => u.Id);

        var therapists = await context.Therapists.ToListAsync();
        foreach (var therapist in therapists)
        {
            if (therapist.UserId.HasValue)
            {
                continue;
            }

            if (!staffUsersByName.TryGetValue(therapist.Name, out var staffUserId))
            {
                continue;
            }

            therapist.UserId = staffUserId;
        }
    }
}
