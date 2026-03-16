using LoveSpaBackend.DTOs.Public;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LoveSpaBackend.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public sealed class PublicController(IConfiguration configuration) : ControllerBase
{
    [HttpGet("site-profile")]
    public ActionResult<SiteProfileDto> GetSiteProfile()
    {
        var section = configuration.GetSection("PublicSiteProfile");
        var openingHours = section.GetSection("OpeningHours").Get<string[]>();

        var dto = new SiteProfileDto
        {
            BusinessName = section["BusinessName"] ?? "Love Spa & Wellness",
            SupportEmail = section["SupportEmail"] ?? "siphomoyo893@gmail.com",
            PhoneDisplay = section["PhoneDisplay"] ?? "+263 789 652 298",
            PhoneDial = section["PhoneDial"] ?? "+263789652298",
            WhatsAppUrl = section["WhatsAppUrl"] ?? "https://wa.me/263789652298",
            Address = section["Address"] ?? "Victoria Falls, Zimbabwe",
            InstagramUrl = section["InstagramUrl"] ?? "https://www.instagram.com/love_spa_wellness/",
            OpeningHours = openingHours is { Length: > 0 }
                ? openingHours
                : new[]
                {
                    "Mon - Fri: 9:00 AM - 8:00 PM",
                    "Sat: 10:00 AM - 7:00 PM",
                    "Sun: 10:00 AM - 6:00 PM"
                }
        };

        return Ok(dto);
    }
}
