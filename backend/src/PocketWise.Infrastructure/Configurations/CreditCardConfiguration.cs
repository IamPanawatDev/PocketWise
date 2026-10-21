using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class CreditCardConfiguration : IEntityTypeConfiguration<CreditCard>
{
    public void Configure(EntityTypeBuilder<CreditCard> builder)
    {
        builder.ToTable("CreditCards");

        builder.HasKey(e => e.CreditCardId);

        builder.Property(e => e.CreditCardId).UseIdentityColumn();
        builder.Property(e => e.BankName).IsRequired().HasMaxLength(100);
        builder.Property(e => e.CardName).IsRequired().HasMaxLength(100);
        builder.Property(e => e.CardNumberMasked).HasMaxLength(30);
        builder.Property(e => e.BillingDay).HasColumnType("smallint");
        builder.Property(e => e.PaymentDueDay).HasColumnType("smallint");
        builder.Property(e => e.CreditLimit).HasPrecision(18, 2);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.User)
            .WithMany(u => u.CreditCards)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
