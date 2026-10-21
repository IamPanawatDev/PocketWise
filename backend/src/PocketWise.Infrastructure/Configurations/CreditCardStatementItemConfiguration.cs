using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class CreditCardStatementItemConfiguration : IEntityTypeConfiguration<CreditCardStatementItem>
{
    public void Configure(EntityTypeBuilder<CreditCardStatementItem> builder)
    {
        builder.ToTable("CreditCardStatementItems");

        builder.HasKey(e => e.StatementItemId);

        builder.Property(e => e.StatementItemId).UseIdentityColumn();
        builder.Property(e => e.TransactionDate).IsRequired().HasColumnType("date");
        builder.Property(e => e.Description).IsRequired().HasMaxLength(500);
        builder.Property(e => e.ItemType).IsRequired().HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(e => e.ExternalReference).HasMaxLength(150);
        builder.Property(e => e.IsDuplicate).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.Statement)
            .WithMany(s => s.Items)
            .HasForeignKey(e => e.StatementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Merchant)
            .WithMany(m => m.CreditCardStatementItems)
            .HasForeignKey(e => e.MerchantId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.InstallmentPlan)
            .WithMany(i => i.CreditCardStatementItems)
            .HasForeignKey(e => e.InstallmentPlanId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Transaction)
            .WithOne(t => t.StatementItem)
            .HasForeignKey<CreditCardStatementItem>(e => e.TransactionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
