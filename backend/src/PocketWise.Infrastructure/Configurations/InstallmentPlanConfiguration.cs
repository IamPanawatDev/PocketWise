using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Configurations;

public class InstallmentPlanConfiguration : IEntityTypeConfiguration<InstallmentPlan>
{
    public void Configure(EntityTypeBuilder<InstallmentPlan> builder)
    {
        builder.ToTable("InstallmentPlans");

        builder.HasKey(e => e.InstallmentPlanId);

        builder.Property(e => e.InstallmentPlanId).UseIdentityColumn();
        builder.Property(e => e.Description).IsRequired().HasMaxLength(300);
        builder.Property(e => e.PrincipalAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(e => e.InstallmentCount).IsRequired().HasColumnType("smallint");
        builder.Property(e => e.InstallmentAmount).IsRequired().HasPrecision(18, 2);
        builder.Property(e => e.InterestRatePercent).IsRequired().HasPrecision(7, 4).HasDefaultValue(0m);
        builder.Property(e => e.StartDate).IsRequired().HasColumnType("date");
        builder.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20).HasDefaultValue(InstallmentStatus.Active);
        builder.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.User)
            .WithMany(u => u.InstallmentPlans)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.CreditCard)
            .WithMany(c => c.InstallmentPlans)
            .HasForeignKey(e => e.CreditCardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Merchant)
            .WithMany(m => m.InstallmentPlans)
            .HasForeignKey(e => e.MerchantId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
