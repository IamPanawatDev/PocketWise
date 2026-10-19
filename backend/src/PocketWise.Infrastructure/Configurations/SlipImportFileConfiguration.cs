using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Configurations;

public class SlipImportFileConfiguration : IEntityTypeConfiguration<SlipImportFile>
{
    public void Configure(EntityTypeBuilder<SlipImportFile> builder)
    {
        builder.ToTable("SlipImportFiles");

        builder.HasKey(e => e.SlipImportFileId);

        builder.Property(e => e.SlipImportFileId).UseIdentityColumn();
        builder.Property(e => e.StorageKey).IsRequired().HasMaxLength(500);
        builder.HasIndex(e => e.StorageKey).IsUnique();
        builder.Property(e => e.OriginalFileName).IsRequired().HasMaxLength(260);
        builder.Property(e => e.MimeType).IsRequired().HasMaxLength(100);
        builder.Property(e => e.FileSizeBytes).IsRequired();
        builder.Property(e => e.BankCode).HasMaxLength(30);
        builder.Property(e => e.PayerName).HasMaxLength(200);
        builder.Property(e => e.PayeeName).HasMaxLength(200);
        builder.Property(e => e.DetectedAmount).HasPrecision(18, 2);
        builder.Property(e => e.DetectedAt).HasColumnType("datetime2");
        builder.Property(e => e.TransactionReference).HasMaxLength(150);
        builder.Property(e => e.FileHash).HasMaxLength(128);
        builder.HasIndex(e => e.FileHash);
        builder.Property(e => e.ReviewStatus).IsRequired().HasConversion<string>().HasMaxLength(20).HasDefaultValue(ReviewStatus.Pending);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(e => e.User)
            .WithMany(u => u.SlipImportFiles)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.ImportJob)
            .WithMany(i => i.SlipImportFiles)
            .HasForeignKey(e => e.ImportJobId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
