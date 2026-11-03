using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class RecurringTransactionTagConfiguration : IEntityTypeConfiguration<RecurringTransactionTag>
{
    public void Configure(EntityTypeBuilder<RecurringTransactionTag> builder)
    {
        builder.ToTable("RecurringTransactionTags");

        builder.HasKey(e => new { e.RecurringTransactionId, e.TagId });

        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasOne(e => e.RecurringTransaction)
            .WithMany(rt => rt.RecurringTransactionTags)
            .HasForeignKey(e => e.RecurringTransactionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Tag)
            .WithMany(t => t.RecurringTransactionTags)
            .HasForeignKey(e => e.TagId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
