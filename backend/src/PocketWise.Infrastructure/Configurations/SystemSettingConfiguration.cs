using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
{
    public void Configure(EntityTypeBuilder<SystemSetting> builder)
    {
        builder.ToTable("SystemSettings");
        builder.HasKey(s => s.SettingKey);
        builder.Property(s => s.SettingKey).HasMaxLength(100);
        builder.Property(s => s.SettingValue).IsRequired().HasMaxLength(500);
        builder.Property(s => s.Description).HasMaxLength(500);
        builder.Property(s => s.UpdatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");
    }
}
