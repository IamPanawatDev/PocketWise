using FluentValidation;
using PocketWise.Application.DTOs.Categories;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Categories;

public class CategoryService : ICategoryService
{
    private readonly ICategoryRepository _repository;
    private readonly IValidator<CreateCategoryRequest> _createValidator;
    private readonly IValidator<UpdateCategoryRequest> _updateValidator;
    private readonly IAuditLogService? _auditLogService;

    public CategoryService(
        ICategoryRepository repository,
        IValidator<CreateCategoryRequest> createValidator,
        IValidator<UpdateCategoryRequest> updateValidator,
        IAuditLogService? auditLogService = null)
    {
        _repository = repository;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyList<CategoryResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetAllAsync(userId, cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<CategoryResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        return entity is null ? null : Map(entity);
    }

    public async Task<CategoryResponse> CreateAsync(long userId, CreateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        if (await _repository.NameExistsAsync(userId, request.CategoryName, cancellationToken: cancellationToken))
        {
            throw new BusinessException("CONFLICT", "มีหมวดหมู่ชื่อนี้อยู่แล้ว");
        }

        var existing = await _repository.GetAllAsync(userId, cancellationToken);
        var maxSort = existing.Where(c => !c.IsSystem).Select(c => (int?)c.SortOrder).Max() ?? 0;

        var entity = new Category
        {
            UserId = userId,
            CategoryName = request.CategoryName,
            CategoryType = request.CategoryType,
            Icon = request.Icon,
            Color = request.Color,
            SortOrder = maxSort + 1,
            IsSystem = false,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Create,
                "Categories",
                entity.CategoryId.ToString(),
                new
                {
                    entity.CategoryName,
                    entity.CategoryType,
                    entity.Icon,
                    entity.Color
                },
                cancellationToken);
        }

        return Map(entity);
    }

    public async Task<CategoryResponse?> UpdateAsync(long id, long userId, UpdateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        if (entity.IsSystem)
        {
            throw new BusinessException("FORBIDDEN", "ไม่สามารถแก้ไขหมวดหมู่ระบบได้");
        }

        if (await _repository.NameExistsAsync(userId, request.CategoryName, id, cancellationToken))
        {
            throw new BusinessException("CONFLICT", "มีหมวดหมู่ชื่อนี้อยู่แล้ว");
        }

        var beforeState = new
        {
            entity.CategoryName,
            entity.CategoryType,
            entity.Icon,
            entity.Color,
            entity.IsActive
        };

        entity.CategoryName = request.CategoryName;
        entity.CategoryType = request.CategoryType;
        entity.Icon = request.Icon;
        entity.Color = request.Color;
        entity.IsActive = request.IsActive;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                "Categories",
                id.ToString(),
                new
                {
                    Before = beforeState,
                    After = new
                    {
                        request.CategoryName,
                        request.CategoryType,
                        request.Icon,
                        request.Color,
                        request.IsActive
                    }
                },
                cancellationToken);
        }

        return Map(entity);
    }

    public async Task ReorderAsync(long userId, ReorderCategoriesRequest request, CancellationToken cancellationToken = default)
    {
        foreach (var item in request.Items)
        {
            var entity = await _repository.GetByIdAsync(item.CategoryId, userId, cancellationToken);
            if (entity is null)
            {
                continue;
            }

            entity.SortOrder = item.SortOrder;
            await _repository.UpdateAsync(entity, cancellationToken);
        }

        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                "Categories",
                "reorder",
                new { Count = request.Items.Count },
                cancellationToken);
        }
    }

    public async Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetByIdAsync(id, userId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        if (entity.IsSystem)
        {
            throw new BusinessException("FORBIDDEN", "ไม่สามารถลบหมวดหมู่ระบบได้");
        }

        if (await _repository.HasTransactionsAsync(id, cancellationToken))
        {
            throw new BusinessException("CONFLICT", "ไม่สามารถลบหมวดหมู่ที่มีรายการใช้งานอยู่ได้");
        }

        await _repository.DeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Delete,
                "Categories",
                id.ToString(),
                new
                {
                    entity.CategoryName,
                    entity.CategoryType
                },
                cancellationToken);
        }

        return true;
    }

    private static CategoryResponse Map(Category entity)
    {
        return new CategoryResponse
        {
            CategoryId = entity.CategoryId,
            CategoryName = entity.CategoryName,
            CategoryType = entity.CategoryType,
            Icon = entity.Icon,
            Color = entity.Color,
            SortOrder = entity.SortOrder,
            IsSystem = entity.IsSystem,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }
}
