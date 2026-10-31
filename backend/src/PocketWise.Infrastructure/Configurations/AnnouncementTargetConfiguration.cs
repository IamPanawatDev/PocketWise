using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class AnnouncementTargetConfiguration : IEntityTypeConfiguration<AnnouncementTarget>
{
    public void Configure(EntityTypeBuilder<AnnouncementTarget> builder)
    {
        builder.ToTable("AnnouncementTargets");

        builder.HasKey(e => e.AnnouncementTargetId);

        builder.Property(e => e.TargetType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasIndex(e => e.AnnouncementId);
        builder.HasIndex(e => e.TargetType);
        builder.HasIndex(e => e.RoleId);
        builder.HasIndex(e => e.UserId);

        builder.HasOne(e => e.Announcement)
            .WithMany(a => a.Targets)
            .HasForeignKey(e => e.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Role)
            .WithMany()
            .HasForeignKey(e => e.RoleId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
