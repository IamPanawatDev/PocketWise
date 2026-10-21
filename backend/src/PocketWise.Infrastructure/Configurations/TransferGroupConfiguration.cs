using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Configurations;

public class TransferGroupConfiguration : IEntityTypeConfiguration<TransferGroup>
{
    public void Configure(EntityTypeBuilder<TransferGroup> builder)
    {
        builder.ToTable("TransferGroups");

        builder.HasKey(e => e.TransferGroupId);

        builder.Property(e => e.TransferGroupId).UseIdentityColumn();
        builder.Property(e => e.Amount).IsRequired().HasPrecision(18, 2);
        builder.Property(e => e.TransferDate).IsRequired().HasColumnType("timestamptz");
        builder.Property(e => e.Reference).HasMaxLength(150);
        builder.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20).HasDefaultValue(TransferGroupStatus.Pending);
        builder.Property(e => e.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasQueryFilter(e => !e.IsDeleted);

        builder.HasOne(e => e.User)
            .WithMany(u => u.TransferGroups)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.FromBankAccount)
            .WithMany(b => b.FromTransferGroups)
            .HasForeignKey(e => e.FromBankAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ToBankAccount)
            .WithMany(b => b.ToTransferGroups)
            .HasForeignKey(e => e.ToBankAccountId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
