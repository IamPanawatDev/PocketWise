using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class BankAccountConfiguration : IEntityTypeConfiguration<BankAccount>
{
    public void Configure(EntityTypeBuilder<BankAccount> builder)
    {
        builder.ToTable("BankAccounts");

        builder.HasKey(e => e.BankAccountId);

        builder.Property(e => e.BankAccountId).UseIdentityColumn();
        builder.Property(e => e.BankCode).HasMaxLength(30);
        builder.Property(e => e.BankName).IsRequired().HasMaxLength(100);
        builder.Property(e => e.AccountName).IsRequired().HasMaxLength(100);
        builder.Property(e => e.AccountNumberMasked).HasMaxLength(30);
        builder.Property(e => e.AccountType).IsRequired().HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.User)
            .WithMany(u => u.BankAccounts)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
