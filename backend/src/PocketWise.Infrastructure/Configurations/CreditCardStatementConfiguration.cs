using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Configurations;

public class CreditCardStatementConfiguration : IEntityTypeConfiguration<CreditCardStatement>
{
    public void Configure(EntityTypeBuilder<CreditCardStatement> builder)
    {
        builder.ToTable("CreditCardStatements");

        builder.HasKey(e => e.StatementId);

        builder.Property(e => e.StatementId).UseIdentityColumn();
        builder.Property(e => e.StatementPeriodStart).IsRequired().HasColumnType("date");
        builder.Property(e => e.StatementPeriodEnd).IsRequired().HasColumnType("date");
        builder.Property(e => e.StatementDate).IsRequired().HasColumnType("date");
        builder.Property(e => e.PaymentDueDate).HasColumnType("date");
        builder.Property(e => e.PreviousBalance).IsRequired().HasPrecision(18, 2).HasDefaultValue(0);
        builder.Property(e => e.PurchaseAmount).IsRequired().HasPrecision(18, 2).HasDefaultValue(0);
        builder.Property(e => e.InstallmentAmount).IsRequired().HasPrecision(18, 2).HasDefaultValue(0);
        builder.Property(e => e.InterestAmount).IsRequired().HasPrecision(18, 2).HasDefaultValue(0);
        builder.Property(e => e.CashbackAmount).IsRequired().HasPrecision(18, 2).HasDefaultValue(0);
        builder.Property(e => e.PaymentAmount).IsRequired().HasPrecision(18, 2).HasDefaultValue(0);
        builder.Property(e => e.TotalDue).IsRequired().HasPrecision(18, 2);
        builder.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20).HasDefaultValue(CreditCardStatementStatus.Imported);
        builder.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.CreditCard)
            .WithMany(c => c.CreditCardStatements)
            .HasForeignKey(e => e.CreditCardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ImportJob)
            .WithMany(i => i.CreditCardStatements)
            .HasForeignKey(e => e.ImportJobId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
