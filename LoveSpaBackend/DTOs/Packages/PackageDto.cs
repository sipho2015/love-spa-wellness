namespace LoveSpaBackend.DTOs.Packages;

public class PackageDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public int DurationMinutes { get; set; }

    public decimal OriginalPrice { get; set; }

    public decimal PackagePrice { get; set; }

    public decimal SavingsAmount { get; set; }

    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; }

    public IReadOnlyList<PackageIncludedServiceDto> IncludedServices { get; set; } = [];
}

public class PackageIncludedServiceDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public int DurationMinutes { get; set; }
}
