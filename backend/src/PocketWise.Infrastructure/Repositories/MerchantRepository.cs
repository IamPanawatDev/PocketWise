using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class MerchantRepository : IMerchantRepository
{
    private readonly PocketWiseDbContext _context;

    public MerchantRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<Merchant?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        return await _context.Merchants
            .Include(m => m.DefaultCategory)
            .FirstOrDefaultAsync(m => m.MerchantId == id, cancellationToken);
    }

    public async Task<IReadOnlyList<Merchant>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Merchants
            .AsNoTracking()
            .Include(m => m.DefaultCategory)
            .OrderBy(m => m.MerchantName)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Merchant>> SearchByNameAsync(string normalizedName, CancellationToken cancellationToken = default)
    {
        return await _context.Merchants
            .AsNoTracking()
            .Where(m => m.NormalizedName == normalizedName || m.NormalizedName.Contains(normalizedName))
            .ToListAsync(cancellationToken);
    }

    public Task<bool> CategoryExistsAsync(long categoryId, CancellationToken cancellationToken = default)
    {
        return _context.Categories.AnyAsync(c => c.CategoryId == categoryId && c.IsSystem, cancellationToken);
    }

    public Task AddAsync(Merchant merchant, CancellationToken cancellationToken = default)
    {
        _context.Merchants.Add(merchant);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Merchant merchant, CancellationToken cancellationToken = default)
    {
        _context.Merchants.Update(merchant);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Merchant merchant, CancellationToken cancellationToken = default)
    {
        _context.Merchants.Remove(merchant);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
