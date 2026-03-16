namespace LoveSpaBackend.DTOs.Public;

public sealed class SiteProfileDto
{
    public string BusinessName { get; init; } = "Love Spa & Wellness";
    public string SupportEmail { get; init; } = "siphomoyo893@gmail.com";
    public string PhoneDisplay { get; init; } = "+263 789 652 298";
    public string PhoneDial { get; init; } = "+263789652298";
    public string WhatsAppUrl { get; init; } = "https://wa.me/263789652298";
    public string Address { get; init; } = "Victoria Falls, Zimbabwe";
    public string InstagramUrl { get; init; } = "https://www.instagram.com/love_spa_wellness/";
    public IReadOnlyList<string> OpeningHours { get; init; } =
    [
        "Mon - Fri: 9:00 AM - 8:00 PM",
        "Sat: 10:00 AM - 7:00 PM",
        "Sun: 10:00 AM - 6:00 PM"
    ];
}
