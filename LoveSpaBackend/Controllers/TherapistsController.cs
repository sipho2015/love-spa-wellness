using LoveSpaBackend.Common;
using LoveSpaBackend.Data;
using LoveSpaBackend.DTOs.Therapists;
using LoveSpaBackend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TherapistsController(ApplicationDbContext context) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<TherapistDto>>> GetAll([FromQuery] bool onlyAvailable = false)
    {
        var query = context.Therapists.AsNoTracking().AsQueryable();
        if (onlyAvailable)
        {
            query = query.Where(t => t.IsAvailable);
        }

        var therapists = await query
            .OrderBy(t => t.Name)
            .Select(t => new TherapistDto
            {
                Id = t.Id,
                Name = t.Name,
                Specialty = t.Specialty,
                IsAvailable = t.IsAvailable,
                UserId = t.UserId,
                UserFullName = t.User != null ? t.User.FullName : null,
                UserEmail = t.User != null ? t.User.Email : null
            })
            .ToListAsync();

        return Ok(therapists);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<TherapistDto>> GetById(int id)
    {
        var therapist = await context.Therapists
            .AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new TherapistDto
            {
                Id = t.Id,
                Name = t.Name,
                Specialty = t.Specialty,
                IsAvailable = t.IsAvailable,
                UserId = t.UserId,
                UserFullName = t.User != null ? t.User.FullName : null,
                UserEmail = t.User != null ? t.User.Email : null
            })
            .FirstOrDefaultAsync();

        return therapist is null ? NotFound() : Ok(therapist);
    }

    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TherapistDto>> Create(SaveTherapistDto request)
    {
        if (!await ValidateStaffLinkAsync(request.UserId))
        {
            return BadRequest(new { message = "Selected staff account is invalid or already linked to another therapist." });
        }

        var entity = new Therapist
        {
            Name = request.Name.Trim(),
            Specialty = request.Specialty.Trim(),
            IsAvailable = request.IsAvailable,
            UserId = request.UserId
        };

        context.Therapists.Add(entity);
        await context.SaveChangesAsync();

        var dto = await MapTherapistAsync(entity.Id);
        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, dto);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<TherapistDto>> Update(int id, SaveTherapistDto request)
    {
        var entity = await context.Therapists.FirstOrDefaultAsync(t => t.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        if (!await ValidateStaffLinkAsync(request.UserId, id))
        {
            return BadRequest(new { message = "Selected staff account is invalid or already linked to another therapist." });
        }

        entity.Name = request.Name.Trim();
        entity.Specialty = request.Specialty.Trim();
        entity.IsAvailable = request.IsAvailable;
        entity.UserId = request.UserId;

        await context.SaveChangesAsync();

        var dto = await MapTherapistAsync(entity.Id);
        return Ok(dto);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await context.Therapists.FirstOrDefaultAsync(t => t.Id == id);
        if (entity is null)
        {
            return NotFound();
        }

        context.Therapists.Remove(entity);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<TherapistDto> MapTherapistAsync(int therapistId) =>
        await context.Therapists
            .AsNoTracking()
            .Where(t => t.Id == therapistId)
            .Select(t => new TherapistDto
            {
                Id = t.Id,
                Name = t.Name,
                Specialty = t.Specialty,
                IsAvailable = t.IsAvailable,
                UserId = t.UserId,
                UserFullName = t.User != null ? t.User.FullName : null,
                UserEmail = t.User != null ? t.User.Email : null
            })
            .FirstAsync();

    private async Task<bool> ValidateStaffLinkAsync(int? userId, int? currentTherapistId = null)
    {
        if (userId is null)
        {
            return true;
        }

        var staffExists = await context.Users.AnyAsync(u => u.Id == userId && u.Role == Roles.Staff);
        if (!staffExists)
        {
            return false;
        }

        var alreadyLinked = await context.Therapists.AnyAsync(t =>
            t.UserId == userId &&
            (!currentTherapistId.HasValue || t.Id != currentTherapistId.Value));

        return !alreadyLinked;
    }
}
