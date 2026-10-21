using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class UserRefreshTokenRepository : IUserRefreshTokenRepository
{
    private readonly PocketWiseDbContext _context;

    public UserRefreshTokenRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<UserRefreshToken?> GetByHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        return await _context.UserRefreshTokens
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow, cancellationToken);
    }

    public async Task<IReadOnlyList<UserRefreshToken>> GetActiveByUserIdAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.UserRefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync(cancellationToken);
    }

    public Task AddAsync(UserRefreshToken token, CancellationToken cancellationToken = default)
    {
        _context.UserRefreshTokens.Add(token);
        return Task.CompletedTask;
    }

    public Task RevokeAsync(UserRefreshToken token, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default)
    {
        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = revokedByIp;
        token.ReasonRevoked = !string.IsNullOrWhiteSpace(reason)
            ? Enum.Parse<RevokeReason>(reason, ignoreCase: true)
            : RevokeReason.Logout;
        _context.UserRefreshTokens.Update(token);
        return Task.CompletedTask;
    }

    public async Task RevokeAllForUserAsync(long userId, string? revokedByIp = null, string? reason = null, CancellationToken cancellationToken = default)
    {
        var tokens = await _context.UserRefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        var parsedReason = !string.IsNullOrWhiteSpace(reason)
            ? Enum.Parse<RevokeReason>(reason, ignoreCase: true)
            : RevokeReason.Compromised;

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedByIp = revokedByIp;
            token.ReasonRevoked = parsedReason;
        }
    }

    public async Task<int> PurgeExpiredTokensAsync(DateTime? cutoffDate = null, CancellationToken cancellationToken = default)
    {
        var cutoff = cutoffDate ?? DateTime.UtcNow;
        return await _context.UserRefreshTokens
            .Where(t => t.ExpiresAt <= cutoff || (t.RevokedAt != null && t.RevokedAt <= cutoff))
            .ExecuteDeleteAsync(cancellationToken);
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
