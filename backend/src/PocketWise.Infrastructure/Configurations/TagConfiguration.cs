using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("Tags");

        builder.HasKey(e => e.TagId);

        builder.Property(e => e.TagId).UseIdentityColumn();
        builder.Property(e => e.TagName).IsRequired().HasMaxLength(50);
        builder.HasIndex(e => new { e.UserId, e.TagName }).IsUnique();
        builder.Property(e => e.Color).HasMaxLength(20);
        builder.Property(e => e.SortOrder).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasOne(e => e.User)
            .WithMany(u => u.Tags)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
