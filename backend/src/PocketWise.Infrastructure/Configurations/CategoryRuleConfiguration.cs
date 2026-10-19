using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class CategoryRuleConfiguration : IEntityTypeConfiguration<CategoryRule>
{
    public void Configure(EntityTypeBuilder<CategoryRule> builder)
    {
        builder.ToTable("CategoryRules");

        builder.HasKey(e => e.CategoryRuleId);

        builder.Property(e => e.CategoryRuleId).UseIdentityColumn();
        builder.Property(e => e.RuleName).IsRequired().HasMaxLength(150);
        builder.Property(e => e.MatchType).IsRequired().HasConversion<string>().HasMaxLength(30);
        builder.Property(e => e.MatchPattern).IsRequired().HasMaxLength(300);
        builder.Property(e => e.Priority).IsRequired().HasDefaultValue(100);
        builder.Property(e => e.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(e => e.UpdatedAt).HasColumnType("datetime2");

        builder.HasOne(e => e.User)
            .WithMany(u => u.CategoryRules)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Category)
            .WithMany(c => c.CategoryRules)
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
