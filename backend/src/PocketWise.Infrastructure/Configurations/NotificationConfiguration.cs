using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.HasKey(e => e.NotificationId);

        builder.Property(e => e.NotificationId).UseIdentityColumn();
        builder.Property(e => e.NotificationType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Title).IsRequired().HasMaxLength(200);
        builder.Property(e => e.Message).IsRequired().HasMaxLength(1000);
        builder.Property(e => e.Channel).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.RelatedEntityType).HasMaxLength(50);
        builder.Property(e => e.SentAt).HasColumnType("timestamptz");
        builder.Property(e => e.ReadAt).HasColumnType("timestamptz");
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasOne(e => e.User)
            .WithMany(u => u.Notifications)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
