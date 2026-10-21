using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface ITagRepository
{
    Task<Tag?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Tag>> GetAllAsync(long userId, CancellationToken cancellationToken = default);
    Task<int> CountByUserAsync(long userId, CancellationToken cancellationToken = default);
    Task<bool> NameExistsAsync(long userId, string name, long? excludeId = null, CancellationToken cancellationToken = default);
    Task AddAsync(Tag tag, CancellationToken cancellationToken = default);
    Task UpdateAsync(Tag tag, CancellationToken cancellationToken = default);
    Task DeleteAsync(Tag tag, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
