using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PocketWise.Domain.Entities;

namespace PocketWise.Infrastructure.Configurations;

public class UserRefreshTokenConfiguration : IEntityTypeConfiguration<UserRefreshToken>
{
    public void Configure(EntityTypeBuilder<UserRefreshToken> builder)
    {
        builder.ToTable("UserRefreshTokens");

        builder.HasKey(e => e.RefreshTokenId);

        builder.Property(e => e.RefreshTokenId).UseIdentityColumn();
        builder.Property(e => e.TokenHash).IsRequired().HasMaxLength(128);
        builder.HasIndex(e => e.TokenHash).IsUnique();
        builder.Property(e => e.ExpiresAt).IsRequired().HasColumnType("datetime2");
        builder.Property(e => e.CreatedAt).IsRequired().HasColumnType("datetime2").HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(e => e.CreatedByIp).HasMaxLength(45);
        builder.Property(e => e.UserAgent).HasMaxLength(255);
        builder.Property(e => e.RevokedAt).HasColumnType("datetime2");
        builder.Property(e => e.RevokedByIp).HasMaxLength(45);
        builder.Property(e => e.ReplacedByTokenHash).HasMaxLength(128);
        builder.Property(e => e.ReasonRevoked)
            .HasConversion<string>()
            .HasMaxLength(100);

        builder.HasOne(e => e.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
