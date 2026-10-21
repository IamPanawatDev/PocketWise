using Microsoft.EntityFrameworkCore;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Infrastructure.Persistence;

namespace PocketWise.Infrastructure.Repositories;

public class TagRepository : ITagRepository
{
    private readonly PocketWiseDbContext _context;

    public TagRepository(PocketWiseDbContext context)
    {
        _context = context;
    }

    public async Task<Tag?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Tags
            .FirstOrDefaultAsync(t => t.TagId == id && t.UserId == userId, cancellationToken);
    }

    public async Task<IReadOnlyList<Tag>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Tags
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.TagName)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> CountByUserAsync(long userId, CancellationToken cancellationToken = default)
    {
        return await _context.Tags.CountAsync(t => t.UserId == userId, cancellationToken);
    }

    public async Task<bool> NameExistsAsync(long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default)
    {
        var query = _context.Tags.Where(t => t.UserId == userId && t.TagName == name);
        if (excludeId.HasValue)
        {
            query = query.Where(t => t.TagId != excludeId.Value);
        }

        return await query.AnyAsync(cancellationToken);
    }

    public Task AddAsync(Tag tag, CancellationToken cancellationToken = default)
    {
        _context.Tags.Add(tag);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Tag tag, CancellationToken cancellationToken = default)
    {
        _context.Tags.Update(tag);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Tag tag, CancellationToken cancellationToken = default)
    {
        _context.Tags.Remove(tag);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        await _context.SaveChangesAsync(cancellationToken);
    }
}
