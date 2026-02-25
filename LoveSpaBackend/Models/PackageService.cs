using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace LoveSpaBackend.Models;

[Table("PackageServices")]
public class PackageService
{
    public int PackageId { get; set; }

    public int ServiceId { get; set; }

    [Range(1, 50)]
    public int DisplayOrder { get; set; } = 1;

    [ForeignKey(nameof(PackageId))]
    public SpaPackage? Package { get; set; }

    [ForeignKey(nameof(ServiceId))]
    public SpaService? Service { get; set; }
}
