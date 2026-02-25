using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Services;
using LoveSpaBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(ApplicationDbContext context) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<ServiceDto>>> GetAll()
    {
        var services = await context.Services
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => ToDto(s))
            .ToListAsync();

        return Ok(services);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<ServiceDto>> GetById(int id)
    {
        var service = await context.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        return service is null ? NotFound() : Ok(ToDto(service));
    }

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ServiceDto>> Create(SaveServiceDto request)
    {
        var entity = new SpaService
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            DurationMinutes = request.DurationMinutes,
            Price = request.Price,
            IsActive = request.IsActive
        };

        context.Services.Add(entity);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, ToDto(entity));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<ServiceDto>> Update(int id, SaveServiceDto request)
    {
        var entity = await context.Services.FirstOrDefaultAsync(s => s.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        entity.Name = request.Name.Trim();
        entity.Description = request.Description.Trim();
        entity.DurationMinutes = request.DurationMinutes;
        entity.Price = request.Price;
        entity.IsActive = request.IsActive;

        await context.SaveChangesAsync();

        return Ok(ToDto(entity));
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await context.Services.FirstOrDefaultAsync(s => s.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        context.Services.Remove(entity);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private static ServiceDto ToDto(SpaService service) =>
        new()
        {
            Id = service.Id,
            Name = service.Name,
            Description = service.Description,
            DurationMinutes = service.DurationMinutes,
            Price = service.Price,
            IsActive = service.IsActive
        };
}
