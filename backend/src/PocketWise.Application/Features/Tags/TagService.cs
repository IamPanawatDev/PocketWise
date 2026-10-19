using FluentValidation;
using PocketWise.Application.DTOs.Tags;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Tags;

public class TagService : ITagService
{
    private const int MaxTagsPerUser = 20;

    private readonly ITagRepository _repository;
    private readonly IValidator<CreateTagRequest> _createValidator;
    private readonly IValidator<UpdateTagRequest> _updateValidator;

    public TagService(
        ITagRepository repository,
        IValidator<CreateTagRequest> createValidator,
        IValidator<UpdateTagRequest> updateValidator)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<TagResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<TagResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<TagResponse> CreateAsync(long userId, CreateTagRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var count = await _repository.CountByUserAsync(userId, cancellationToken);
        if (count >= MaxTagsPerUser)
        {
            throw new BusinessException("TAG_LIMIT_REACHED", $"สร้างแท็กได้สูงสุด {MaxTagsPerUser} รายการ");
        }

        if (await _repository.NameExistsAsync(userId, request.TagName, cancellationToken: cancellationToken))
        {
            throw new BusinessException("CONFLICT", "มีแท็กชื่อนี้อยู่แล้ว");
        }

        var entity = new Tag
        {
            UserId = userId,
            TagName = request.TagName,
            Color = request.Color,
            SortOrder = 0,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task<TagResponse?> UpdateAsync(long id, long userId, UpdateTagRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (await _repository.NameExistsAsync(userId, request.TagName, id, cancellationToken))
        {
            throw new BusinessException("CONFLICT", "มีแท็กชื่อนี้อยู่แล้ว");
        }

        entity.TagName = request.TagName;
        entity.Color = request.Color;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        return Map(entity);
    }

    public async Task ReorderAsync(long userId, ReorderTagsRequest request, CancellationToken cancellationToken = default)
    {
        foreach (var item in request.Items)
        {
            var entity = await _repository.GetByIdAsync(item.TagId, userId, cancellationToken);
            if (entity is null)
            {
                continue;
            }

            entity.SortOrder = item.SortOrder;
            await _repository.UpdateAsync(entity, cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        await _repository.DeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static TagResponse Map(Tag entity)
    {
        return new TagResponse
        {
            TagId = entity.TagId,
            TagName = entity.TagName,
            Color = entity.Color,
            SortOrder = entity.SortOrder,
            CreatedAt = entity.CreatedAt
        };
    }
}
