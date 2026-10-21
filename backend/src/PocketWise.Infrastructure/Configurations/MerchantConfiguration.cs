using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class MerchantConfiguration : IEntityTypeConfiguration<Merchant>
{
    public void Configure(EntityTypeBuilder<Merchant> builder)
    {
        builder.ToTable("Merchants");

        builder.HasKey(e => e.MerchantId);

        builder.Property(e => e.MerchantId).UseIdentityColumn();
        builder.Property(e => e.MerchantName).IsRequired().HasMaxLength(200);
        builder.Property(e => e.NormalizedName).IsRequired().HasMaxLength(200);
        builder.HasIndex(e => e.NormalizedName);
        builder.Property(e => e.BankOrProvider).HasMaxLength(100);
        builder.Property(e => e.IsVerified).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasOne(e => e.DefaultCategory)
            .WithMany(c => c.Merchants)
            .HasForeignKey(e => e.DefaultCategoryId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
