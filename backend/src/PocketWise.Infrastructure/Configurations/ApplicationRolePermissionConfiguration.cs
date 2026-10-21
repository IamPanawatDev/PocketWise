using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class ApplicationRolePermissionConfiguration : IEntityTypeConfiguration<ApplicationRolePermission>
{
    public void Configure(EntityTypeBuilder<ApplicationRolePermission> builder)
    {
        builder.ToTable("RolePermissions");

        builder.HasKey(e => new { e.RoleId, e.PermissionId });

        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasOne(e => e.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(e => e.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(e => e.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
