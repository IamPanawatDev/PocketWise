using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Configurations;

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> builder)
    {
        builder.ToTable("UserSettings");

        builder.HasKey(e => e.UserId);

        builder.Property(e => e.Theme)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(10)
            .HasDefaultValue(Theme.Light);

        builder.Property(e => e.CurrencyCode).IsRequired().HasMaxLength(3).HasDefaultValue("THB");
        builder.Property(e => e.Locale).IsRequired().HasMaxLength(10).HasDefaultValue("th-TH");
        builder.Property(e => e.EmailBudgetAlertsEnabled).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.UpdatedAt).IsRequired().HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(e => e.User)
            .WithOne(u => u.UserSettings)
            .HasForeignKey<UserSettings>(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
