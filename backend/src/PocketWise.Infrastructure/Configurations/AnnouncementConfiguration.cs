using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> builder)
    {
        builder.ToTable("Announcements");

        builder.HasKey(e => e.AnnouncementId);

        builder.Property(e => e.Title).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Message).IsRequired().HasMaxLength(2000);
        builder.Property(e => e.StartsAt).IsRequired().HasColumnType("timestamptz");
        builder.Property(e => e.EndsAt).IsRequired().HasColumnType("timestamptz");
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");
        builder.Property(e => e.UpdatedAt).HasColumnType("timestamptz");

        builder.HasIndex(e => e.IsActive);
        builder.HasIndex(e => new { e.StartsAt, e.EndsAt });

        builder.HasOne(e => e.CreatedByUser)
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(e => e.Targets)
            .WithOne(t => t.Announcement)
            .HasForeignKey(t => t.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
