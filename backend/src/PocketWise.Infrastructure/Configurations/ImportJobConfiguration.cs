using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;

namespace PocketWise.Infrastructure.Configurations;

public class ImportJobConfiguration : IEntityTypeConfiguration<ImportJob>
{
    public void Configure(EntityTypeBuilder<ImportJob> builder)
    {
        builder.ToTable("ImportJobs");

        builder.HasKey(e => e.ImportJobId);

        builder.Property(e => e.ImportJobId).UseIdentityColumn();
        builder.Property(e => e.ImportType).IsRequired().HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.FileName).HasMaxLength(260);
        builder.Property(e => e.Status).IsRequired().HasConversion<string>().HasMaxLength(20).HasDefaultValue(ImportJobStatus.Pending);
        builder.Property(e => e.TotalRecords).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.ImportedRecords).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.DuplicateRecords).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.ErrorMessage).HasMaxLength(2000);
        builder.Property(e => e.StartedAt).HasColumnType("datetime2");
        builder.Property(e => e.CompletedAt).HasColumnType("datetime2");
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasOne(e => e.User)
            .WithMany(u => u.ImportJobs)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
