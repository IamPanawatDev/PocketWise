using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class UserCategoryOrderConfiguration : IEntityTypeConfiguration<UserCategoryOrder>
{
    public void Configure(EntityTypeBuilder<UserCategoryOrder> builder)
    {
        builder.ToTable("UserCategoryOrders");

        builder.HasKey(e => new { e.UserId, e.CategoryId });

        builder.Property(e => e.SortOrder).IsRequired().HasDefaultValue(0);
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("timestamptz").HasDefaultValueSql("NOW()");

        builder.HasOne(e => e.User)
            .WithMany(u => u.UserCategoryOrders)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(e => e.Category)
            .WithMany(c => c.UserCategoryOrders)
            .HasForeignKey(e => e.CategoryId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
