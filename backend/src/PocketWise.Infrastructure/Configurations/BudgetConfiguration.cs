using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("Budgets");

        builder.HasKey(e => e.BudgetId);

        builder.Property(e => e.BudgetId).UseIdentityColumn();
        builder.Property(e => e.BudgetName).IsRequired().HasMaxLength(150);
        builder.Property(e => e.ScopeType).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.AmountLimit).IsRequired().HasPrecision(18, 2);
        builder.Property(e => e.PeriodType).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.StartDate).IsRequired().HasColumnType("date");
        builder.Property(e => e.EndDate).HasColumnType("date");
        builder.Property(e => e.AlertThresholdPercent).IsRequired().HasColumnType("smallint").HasDefaultValue(80);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.User)
            .WithMany(u => u.Budgets)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Category)
            .WithMany(c => c.Budgets)
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Tag)
            .WithMany(t => t.Budgets)
            .HasForeignKey(e => e.TagId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
