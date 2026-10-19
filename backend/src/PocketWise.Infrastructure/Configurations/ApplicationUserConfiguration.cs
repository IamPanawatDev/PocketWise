using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.ToTable("Users");

        builder.Property(e => e.DisplayName).IsRequired().HasMaxLength(150);
        builder.Property(e => e.BirthDate).HasColumnType("date");
        builder.Property(e => e.IsEmailVerified).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(e => e.UpdatedAt).HasColumnType("datetime2");

        builder.HasIndex(e => e.Email).IsUnique();
        builder.HasIndex(e => e.NormalizedEmail).IsUnique();
        builder.HasIndex(e => e.NormalizedUserName).IsUnique();

        builder.HasMany(e => e.RefreshTokens)
            .WithOne(t => t.User)
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.UserSettings)
            .WithOne(s => s.User)
            .HasForeignKey<UserSettings>(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
