using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class SecurityEventConfiguration : IEntityTypeConfiguration<SecurityEvent>
{
    public void Configure(EntityTypeBuilder<SecurityEvent> builder)
    {
        builder.ToTable("SecurityEvents");

        builder.HasKey(e => e.SecurityEventId);

        builder.Property(e => e.EventType).IsRequired().HasMaxLength(50);
        builder.Property(e => e.Succeeded).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.IpAddress).HasMaxLength(45);
        builder.Property(e => e.UserAgent).HasMaxLength(500);
        builder.Property(e => e.DetailsJson).HasColumnType("text");
        builder.Property(e => e.OccurredAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasIndex(e => e.EventType);
        builder.HasIndex(e => e.TargetUserId);
        builder.HasIndex(e => e.ActorUserId);
        builder.HasIndex(e => e.OccurredAt);

        builder.HasOne(e => e.TargetUser)
            .WithMany()
            .HasForeignKey(e => e.TargetUserId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.ActorUser)
            .WithMany()
            .HasForeignKey(e => e.ActorUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
