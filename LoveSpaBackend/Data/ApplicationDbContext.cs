using LoveSpaBackend.Common;
using LoveSpaBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace LoveSpaBackend.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<SpaService> Services => Set<SpaService>();
    public DbSet<SpaPackage> Packages => Set<SpaPackage>();
    public DbSet<PackageService> PackageServices => Set<PackageService>();
    public DbSet<Therapist> Therapists => Set<Therapist>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Inquiry> Inquiries => Set<Inquiry>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(t => t.TokenHash)
            .IsUnique();

        modelBuilder.Entity<PasswordResetToken>()
            .HasIndex(t => t.ExpiresAtUtc);

        modelBuilder.Entity<PasswordResetToken>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Inquiry>()
            .HasIndex(i => i.CreatedAtUtc);

        modelBuilder.Entity<Inquiry>()
            .Property(i => i.Status)
            .HasDefaultValue(InquiryStatuses.Pending);

        modelBuilder.Entity<SpaService>()
            .Property(s => s.Price)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<SpaPackage>()
            .Property(p => p.OriginalPrice)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<SpaPackage>()
            .Property(p => p.PackagePrice)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<PackageService>()
            .HasKey(ps => new { ps.PackageId, ps.ServiceId });

        modelBuilder.Entity<PackageService>()
            .HasOne(ps => ps.Package)
            .WithMany(p => p.PackageServices)
            .HasForeignKey(ps => ps.PackageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PackageService>()
            .HasOne(ps => ps.Service)
            .WithMany()
            .HasForeignKey(ps => ps.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Therapist>()
            .HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Therapist>()
            .HasIndex(t => t.UserId)
            .IsUnique()
            .HasFilter("[UserId] IS NOT NULL");

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Service)
            .WithMany()
            .HasForeignKey(a => a.ServiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Therapist)
            .WithMany()
            .HasForeignKey(a => a.TherapistId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.CustomerUser)
            .WithMany()
            .HasForeignKey(a => a.CustomerUserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Appointment>()
            .HasIndex(a => new { a.TherapistId, a.AppointmentDate, a.TimeSlot, a.Status });

        modelBuilder.Entity<Appointment>()
            .HasIndex(a => a.CustomerUserId);

        modelBuilder.Entity<Appointment>()
            .Property(a => a.CreatedAtUtc)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        modelBuilder.Entity<Appointment>()
            .Property(a => a.UpdatedAtUtc)
            .HasDefaultValueSql("SYSUTCDATETIME()");

        modelBuilder.Entity<Appointment>()
            .Property(a => a.DepositAmount)
            .HasColumnType("decimal(10,2)");

        modelBuilder.Entity<Appointment>()
            .Property(a => a.DepositStatus)
            .HasMaxLength(20)
            .HasDefaultValue(DepositStatuses.Pending);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.IsRead, n.CreatedAtUtc });

        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.Role, n.IsRead, n.CreatedAtUtc });

        modelBuilder.Entity<Notification>()
            .Property(n => n.CreatedAtUtc)
            .HasDefaultValueSql("SYSUTCDATETIME()");
    }
}
