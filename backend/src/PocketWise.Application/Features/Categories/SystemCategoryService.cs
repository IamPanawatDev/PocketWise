using FluentValidation;
using PocketWise.Application.DTOs.Categories;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Categories;

public class SystemCategoryService : ISystemCategoryService
{
    private readonly ICategoryRepository _repository;
    private readonly IValidator<CreateCategoryRequest> _createValidator;
    private readonly IValidator<UpdateCategoryRequest> _updateValidator;
    private readonly IAuditLogService? _auditLogService;

    private static readonly (string Name, CategoryType Type, string Icon, string Color, int SortOrder)[] DefaultCategories =
    [
        ("อาหารและเครื่องดื่ม", CategoryType.Expense, "Utensils", "#EF4444", 1),
        ("การเดินทาง / ยานพาหนะ", CategoryType.Expense, "Car", "#F97316", 2),
        ("ช้อปปิ้ง / ของใช้", CategoryType.Expense, "ShoppingBag", "#EC4899", 3),
        ("ที่อยู่อาศัย / บิลค่าใช้จ่าย", CategoryType.Expense, "Home", "#8B5CF6", 4),
        ("บันเทิง / พักผ่อน", CategoryType.Expense, "Film", "#06B6D4", 5),
        ("สุขภาพและการรักษา", CategoryType.Expense, "HeartPulse", "#10B981", 6),
        ("การศึกษา / พัฒนาตนเอง", CategoryType.Expense, "GraduationCap", "#3B82F6", 7),
        ("การเงินและการลงทุน", CategoryType.Expense, "Banknote", "#6366F1", 8),
        ("เงินเดือน", CategoryType.Income, "Briefcase", "#22C55E", 9),
        ("โบนัส / รายได้พิเศษ", CategoryType.Income, "Award", "#EAB308", 10),
        ("ผลตอบแทนการลงทุน", CategoryType.Income, "TrendingUp", "#14B8A6", 11),
        ("ของขวัญ / ได้รับเงิน", CategoryType.Income, "Gift", "#A855F7", 12)
    ];

    public SystemCategoryService(
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

    public async Task<IReadOnlyList<CategoryResponse>> GetSystemCategoriesAsync(CancellationToken cancellationToken = default)
    {
        var entities = await _repository.GetSystemCategoriesAsync(cancellationToken);
        return entities.Select(Map).ToList();
    }

    public async Task<CategoryResponse?> GetSystemCategoryByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetSystemCategoryByIdAsync(id, cancellationToken);
        return entity == null ? null : Map(entity);
    }

    public async Task<CategoryResponse> CreateSystemCategoryAsync(long actorUserId, CreateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var trimmedName = request.CategoryName.Trim();
        if (await _repository.SystemNameExistsAsync(trimmedName, null, cancellationToken))
        {
            throw new BusinessException("CONFLICT", "มีหมวดหมู่มาตรฐานชื่อนี้อยู่แล้ว");
        }

        var existing = await _repository.GetSystemCategoriesAsync(cancellationToken);
        var maxSort = existing.Count > 0 ? existing.Max(c => c.SortOrder) : 0;

        var entity = new Category
        {
            CategoryName = trimmedName,
            CategoryType = request.CategoryType,
            Icon = request.Icon,
            Color = request.Color,
            SortOrder = maxSort + 1,
            IsActive = true,
            IsSystem = true,
            UserId = null,
            CreatedAt = DateTime.UtcNow
        };

        await _repository.AddAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Create,
                "Categories",
                entity.CategoryId.ToString(),
                new
                {
                    entity.CategoryName,
                    entity.CategoryType,
                    entity.Icon,
                    entity.Color,
                    entity.IsSystem,
                    entity.IsActive
                },
                cancellationToken);
        }

        return Map(entity);
    }

    public async Task<CategoryResponse?> UpdateSystemCategoryAsync(long id, long actorUserId, UpdateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);

        var entity = await _repository.GetSystemCategoryByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var trimmedName = request.CategoryName.Trim();
        if (await _repository.SystemNameExistsAsync(trimmedName, id, cancellationToken))
        {
            throw new BusinessException("CONFLICT", "มีหมวดหมู่มาตรฐานชื่อนี้อยู่แล้ว");
        }

        var beforeState = new
        {
            entity.CategoryName,
            entity.CategoryType,
            entity.Icon,
            entity.Color,
            entity.IsActive
        };

        entity.CategoryName = trimmedName;
        entity.CategoryType = request.CategoryType;
        entity.Icon = request.Icon;
        entity.Color = request.Color;
        entity.IsActive = request.IsActive;

        await _repository.UpdateAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
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

    public async Task<bool> DeleteSystemCategoryAsync(long id, long actorUserId, CancellationToken cancellationToken = default)
    {
        var entity = await _repository.GetSystemCategoryByIdAsync(id, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        if (await _repository.HasTransactionsAsync(id, cancellationToken))
        {
            throw new BusinessException("CONFLICT", "ไม่สามารถลบหมวดหมู่ระบบนี้ได้เนื่องจากมีรายการธุรกรรมอ้างอิงอยู่ (แนะนำให้ปิดการใช้งานแทน)");
        }

        var beforeState = new
        {
            entity.CategoryName,
            entity.CategoryType,
            entity.Icon,
            entity.Color,
            entity.IsActive
        };

        await _repository.DeleteAsync(entity, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Delete,
                "Categories",
                id.ToString(),
                beforeState,
                cancellationToken);
        }

        return true;
    }

    public async Task ReorderSystemCategoriesAsync(long actorUserId, ReorderCategoriesRequest request, CancellationToken cancellationToken = default)
    {
        var categories = (await _repository.GetSystemCategoriesAsync(cancellationToken)).ToList();
        var categoryMap = categories.ToDictionary(c => c.CategoryId);

        foreach (var item in request.Items)
        {
            if (categoryMap.TryGetValue(item.CategoryId, out var cat))
            {
                cat.SortOrder = item.SortOrder;
                await _repository.UpdateAsync(cat, cancellationToken);
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                actorUserId,
                AuditAction.Update,
                "Categories",
                "system-reorder",
                new { Count = request.Items.Count },
                cancellationToken);
        }
    }

    public async Task<int> SeedDefaultCategoriesAsync(long actorUserId, CancellationToken cancellationToken = default)
    {
        var existing = await _repository.GetSystemCategoriesAsync(cancellationToken);
        var existingNames = new HashSet<string>(existing.Select(c => c.CategoryName), StringComparer.OrdinalIgnoreCase);

        var maxSort = existing.Count > 0 ? existing.Max(c => c.SortOrder) : 0;
        var addedCount = 0;

        foreach (var def in DefaultCategories)
        {
            if (!existingNames.Contains(def.Name))
            {
                maxSort++;
                var entity = new Category
                {
                    CategoryName = def.Name,
                    CategoryType = def.Type,
                    Icon = def.Icon,
                    Color = def.Color,
                    SortOrder = maxSort,
                    IsActive = true,
                    IsSystem = true,
                    UserId = null,
                    CreatedAt = DateTime.UtcNow
                };

                await _repository.AddAsync(entity, cancellationToken);
                addedCount++;
            }
        }

        if (addedCount > 0)
        {
            await _repository.SaveChangesAsync(cancellationToken);

            if (_auditLogService != null)
            {
                await _auditLogService.LogAsync(
                    actorUserId,
                    AuditAction.Import,
                    "Categories",
                    "seed-defaults",
                    new { AddedCount = addedCount },
                    cancellationToken);
            }
        }

        return addedCount;
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
            IsActive = entity.IsActive
        };
    }
}
