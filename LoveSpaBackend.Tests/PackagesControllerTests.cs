using LoveSpaBackend.Controllers;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Packages;
using LoveSpaBackend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Tests;

public class PackagesControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenPackagePriceIsGreaterThanOriginalPrice()
    {
        await using var context = CreateContext();
        context.Services.Add(new SpaService
        {
            Name = "Swedish Relaxation Massage",
            Description = "Relaxing massage service",
            DurationMinutes = 60,
            Price = 89.00m,
            IsActive = true
        });
        await context.SaveChangesAsync();

        var serviceId = await context.Services.Select(s => s.Id).SingleAsync();
        var controller = new PackagesController(context);

        var result = await controller.Create(new SavePackageDto
        {
            Name = "Invalid Pricing Package",
            Description = "Should fail validation",
            DurationMinutes = 90,
            OriginalPrice = 100,
            PackagePrice = 120,
            IsActive = true,
            ServiceIds = [serviceId]
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetAll_ReturnsOnlyActive_WhenOnlyActiveFilterIsTrue()
    {
        await using var context = CreateContext();
        context.Packages.AddRange(
            new SpaPackage
            {
                Name = "Active Package",
                Description = "Visible package",
                DurationMinutes = 90,
                OriginalPrice = 150,
                PackagePrice = 129,
                IsActive = true
            },
            new SpaPackage
            {
                Name = "Inactive Package",
                Description = "Hidden package",
                DurationMinutes = 90,
                OriginalPrice = 140,
                PackagePrice = 119,
                IsActive = false
            }
        );
        await context.SaveChangesAsync();

        var controller = new PackagesController(context);
        var result = await controller.GetAll(true);
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsAssignableFrom<IEnumerable<PackageDto>>(okResult.Value);
        var packages = payload.ToList();

        Assert.Single(packages);
        Assert.Equal("Active Package", packages[0].Name);
    }

    [Fact]
    public async Task Create_ReturnsCreatedPackage_WithIncludedServices()
    {
        await using var context = CreateContext();
        context.Services.AddRange(
            new SpaService
            {
                Name = "Swedish Relaxation Massage",
                Description = "Relaxing massage service",
                DurationMinutes = 60,
                Price = 89.00m,
                IsActive = true
            },
            new SpaService
            {
                Name = "Glow Facial Treatment",
                Description = "Hydrating facial",
                DurationMinutes = 45,
                Price = 79.00m,
                IsActive = true
            }
        );
        await context.SaveChangesAsync();

        var serviceIds = await context.Services
            .OrderBy(s => s.Name)
            .Select(s => s.Id)
            .ToListAsync();

        var controller = new PackagesController(context);
        var result = await controller.Create(new SavePackageDto
        {
            Name = "Serenity Escape Package",
            Description = "Massage plus facial package",
            DurationMinutes = 105,
            OriginalPrice = 168,
            PackagePrice = 149,
            IsActive = true,
            ServiceIds = serviceIds
        });

        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var payload = Assert.IsType<PackageDto>(createdResult.Value);

        Assert.Equal("Serenity Escape Package", payload.Name);
        Assert.Equal(2, payload.IncludedServices.Count);
        Assert.Equal(19m, payload.SavingsAmount);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }
}
