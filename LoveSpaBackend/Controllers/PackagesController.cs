using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Packages;
using LoveSpaBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PackagesController(ApplicationDbContext context) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<PackageDto>>> GetAll([FromQuery] bool onlyActive = false)
    {
        var query = context.Packages
            .AsNoTracking()
            .Include(p => p.PackageServices)
            .ThenInclude(ps => ps.Service)
            .AsQueryable();

        if (onlyActive)
        {
            query = query.Where(p => p.IsActive);
        }

        var packages = await query
            .OrderBy(p => p.Name)
            .ToListAsync();

        return Ok(packages.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<PackageDto>> GetById(int id)
    {
        var package = await context.Packages
            .AsNoTracking()
            .Include(p => p.PackageServices)
            .ThenInclude(ps => ps.Service)
            .FirstOrDefaultAsync(p => p.Id == id);

        return package is null ? NotFound() : Ok(ToDto(package));
    }

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PackageDto>> Create(SavePackageDto request)
    {
        var validationResult = await ValidateServiceIdsAsync(request.ServiceIds);
        if (!validationResult.IsValid)
        {
            return BadRequest(new { message = validationResult.ErrorMessage });
        }

        if (request.PackagePrice > request.OriginalPrice)
        {
            return BadRequest(new { message = "Package price cannot be greater than original price." });
        }

        var serviceIds = validationResult.NormalizedIds;
        var entity = new SpaPackage
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            DurationMinutes = request.DurationMinutes,
            OriginalPrice = request.OriginalPrice,
            PackagePrice = request.PackagePrice,
            ImageUrl = request.ImageUrl?.Trim(),
            IsActive = request.IsActive
        };

        for (var i = 0; i < serviceIds.Length; i++)
        {
            entity.PackageServices.Add(new PackageService
            {
                ServiceId = serviceIds[i],
                DisplayOrder = i + 1
            });
        }

        context.Packages.Add(entity);
        await context.SaveChangesAsync();

        var created = await context.Packages
            .AsNoTracking()
            .Include(p => p.PackageServices)
            .ThenInclude(ps => ps.Service)
            .FirstAsync(p => p.Id == entity.Id);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ToDto(created));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<PackageDto>> Update(int id, SavePackageDto request)
    {
        var validationResult = await ValidateServiceIdsAsync(request.ServiceIds);
        if (!validationResult.IsValid)
        {
            return BadRequest(new { message = validationResult.ErrorMessage });
        }

        if (request.PackagePrice > request.OriginalPrice)
        {
            return BadRequest(new { message = "Package price cannot be greater than original price." });
        }

        var entity = await context.Packages
            .Include(p => p.PackageServices)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (entity is null)
        {
            return NotFound();
        }

        entity.Name = request.Name.Trim();
        entity.Description = request.Description.Trim();
        entity.DurationMinutes = request.DurationMinutes;
        entity.OriginalPrice = request.OriginalPrice;
        entity.PackagePrice = request.PackagePrice;
        entity.ImageUrl = request.ImageUrl?.Trim();
        entity.IsActive = request.IsActive;

        context.PackageServices.RemoveRange(entity.PackageServices);
        entity.PackageServices.Clear();

        var serviceIds = validationResult.NormalizedIds;
        for (var i = 0; i < serviceIds.Length; i++)
        {
            entity.PackageServices.Add(new PackageService
            {
                PackageId = entity.Id,
                ServiceId = serviceIds[i],
                DisplayOrder = i + 1
            });
        }

        await context.SaveChangesAsync();

        var updated = await context.Packages
            .AsNoTracking()
            .Include(p => p.PackageServices)
            .ThenInclude(ps => ps.Service)
            .FirstAsync(p => p.Id == entity.Id);

        return Ok(ToDto(updated));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await context.Packages.FirstOrDefaultAsync(p => p.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        context.Packages.Remove(entity);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<(bool IsValid, int[] NormalizedIds, string ErrorMessage)> ValidateServiceIdsAsync(
        IReadOnlyList<int> requestServiceIds)
    {
        var serviceIds = requestServiceIds
            .Where(id => id > 0)
            .Distinct()
            .ToArray();

        if (serviceIds.Length == 0)
        {
            return (false, [], "At least one valid service is required.");
        }

        var availableServiceIds = await context.Services
            .AsNoTracking()
            .Where(s => serviceIds.Contains(s.Id))
            .Select(s => s.Id)
            .ToListAsync();

        if (availableServiceIds.Count != serviceIds.Length)
        {
            return (false, [], "One or more selected services do not exist.");
        }

        return (true, serviceIds, string.Empty);
    }

    private static PackageDto ToDto(SpaPackage package)
    {
        var includedServices = package.PackageServices
            .Where(ps => ps.Service is not null)
            .OrderBy(ps => ps.DisplayOrder)
            .ThenBy(ps => ps.Service!.Name)
            .Select(ps => new PackageIncludedServiceDto
            {
                Id = ps.ServiceId,
                Name = ps.Service!.Name,
                DurationMinutes = ps.Service.DurationMinutes
            })
            .ToList();

        return new PackageDto
        {
            Id = package.Id,
            Name = package.Name,
            Description = package.Description,
            DurationMinutes = package.DurationMinutes,
            OriginalPrice = package.OriginalPrice,
            PackagePrice = package.PackagePrice,
            SavingsAmount = package.OriginalPrice - package.PackagePrice,
            ImageUrl = package.ImageUrl,
            IsActive = package.IsActive,
            IncludedServices = includedServices
        };
    }
}
