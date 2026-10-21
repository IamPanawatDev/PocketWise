using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("Permissions");

        builder.HasKey(e => e.PermissionId);

        builder.Property(e => e.PermissionId).UseIdentityColumn();
        builder.Property(e => e.PermissionCode).IsRequired().HasMaxLength(100);
        builder.HasIndex(e => e.PermissionCode).IsUnique();
        builder.Property(e => e.PermissionName).IsRequired().HasMaxLength(150);
        builder.Property(e => e.Module).IsRequired().HasMaxLength(100);
        builder.Property(e => e.Description).HasMaxLength(255);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");
    }
}
