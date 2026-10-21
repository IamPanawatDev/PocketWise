using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transactions");

        builder.HasKey(e => e.TransactionId);

        builder.Property(e => e.TransactionId).UseIdentityColumn();
        builder.Property(e => e.TransactionType).IsRequired().HasConversion<string>().HasMaxLength(20);
        builder.Property(e => e.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(e => e.CurrencyCode).IsRequired().HasMaxLength(3).HasDefaultValue("THB");
        builder.Property(e => e.TransactionDate).IsRequired().HasColumnType("timestamptz");
        builder.Property(e => e.Description).HasMaxLength(500);
        builder.Property(e => e.SourceType).IsRequired().HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20).HasDefaultValue(TransactionStatus.Confirmed);
        builder.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");
        builder.Property(e => e.UpdatedAt).HasColumnType("timestamptz");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.User)
            .WithMany(u => u.Transactions)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Category)
            .WithMany(c => c.Transactions)
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.Merchant)
            .WithMany(m => m.Transactions)
            .HasForeignKey(e => e.MerchantId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.BankAccount)
            .WithMany(b => b.Transactions)
            .HasForeignKey(e => e.BankAccountId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.CreditCard)
            .WithMany(c => c.Transactions)
            .HasForeignKey(e => e.CreditCardId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.ImportJob)
            .WithMany(i => i.Transactions)
            .HasForeignKey(e => e.ImportJobId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.SlipImportFile)
            .WithOne(s => s.Transaction)
            .HasForeignKey<Transaction>(e => e.SlipImportFileId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.StatementItem)
            .WithOne(s => s.Transaction)
            .HasForeignKey<Transaction>(e => e.StatementItemId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.TransferGroup)
            .WithMany(t => t.Transactions)
            .HasForeignKey(e => e.TransferGroupId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(e => e.RecurringTransaction)
            .WithMany(r => r.Transactions)
            .HasForeignKey(e => e.RecurringTransactionId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
