using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Features.Notifications.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Imports;

public class StatementImportService : IStatementImportService
{
    private readonly IImportRepository _repository;
    private readonly IStatementParserService _parserService;
    private readonly INotificationSender? _notificationSender;

    public StatementImportService(
        IImportRepository repository,
        IStatementParserService parserService,
        INotificationSender? notificationSender = null)
    {
        _repository = repository;
        _parserService = parserService;
        _notificationSender = notificationSender;
    }

    public async Task<CreditCardStatementImportResponse> ImportStatementAsync(
        long userId,
        long creditCardId,
        Stream fileStream,
        string fileName,
        string? format = null,
        CancellationToken cancellationToken = default)
    {
        var cardExists = await _repository.CreditCardExistsAsync(userId, creditCardId, cancellationToken);
        if (!cardExists)
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบบัตรเครดิตที่ระบุ");
        }

        // Parse statement (CSV or JSON)
        var parsed = await _parserService.ParseStatementAsync(fileStream, fileName, format, cancellationToken);

        if (parsed.Items.Count == 0)
        {
            throw new BusinessException("VALIDATION_ERROR", "ไม่พบรายการธุรกรรมในไฟล์ใบแจ้งยอด");
        }

        var duplicateCount = 0;
        var statementItems = new List<CreditCardStatementItem>();
        var responseItems = new List<StatementItemResponse>();

        foreach (var item in parsed.Items)
        {
            var isDuplicate = await _repository.HasDuplicateItemAsync(
                creditCardId,
                item.TransactionDate,
                item.Amount,
                item.ExternalReference,
                cancellationToken);

            if (isDuplicate) duplicateCount++;

            var entity = new CreditCardStatementItem
            {
                TransactionDate = item.TransactionDate,
                Description = item.Description,
                ItemType = item.ItemType,
                Amount = item.Amount,
                ExternalReference = item.ExternalReference,
                IsDuplicate = isDuplicate,
                CreatedAt = DateTime.UtcNow
            };
            statementItems.Add(entity);
        }

        // Create ImportJob
        var importJob = new ImportJob
        {
            UserId = userId,
            ImportType = ImportType.CardStatement,
            FileName = fileName,
            Status = ImportJobStatus.NeedsReview,
            TotalRecords = parsed.Items.Count,
            ImportedRecords = 0,
            DuplicateRecords = duplicateCount,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        await _repository.AddImportJobAsync(importJob, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        // Create Statement
        var statement = new CreditCardStatement
        {
            CreditCardId = creditCardId,
            ImportJobId = importJob.ImportJobId,
            StatementDate = parsed.StatementDate,
            StatementPeriodStart = parsed.StatementPeriodStart,
            StatementPeriodEnd = parsed.StatementPeriodEnd,
            PaymentDueDate = parsed.PaymentDueDate,
            PreviousBalance = parsed.PreviousBalance,
            PurchaseAmount = parsed.PurchaseAmount,
            InstallmentAmount = parsed.InstallmentAmount,
            InterestAmount = parsed.InterestAmount,
            CashbackAmount = parsed.CashbackAmount,
            PaymentAmount = parsed.PaymentAmount,
            TotalDue = parsed.TotalDue,
            Status = CreditCardStatementStatus.Imported,
            CreatedAt = DateTime.UtcNow,
            Items = statementItems
        };

        await _repository.AddStatementAsync(statement, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        // Suggest categories for response
        foreach (var item in statement.Items)
        {
            var (sugId, sugName) = await _repository.SuggestCategoryAsync(userId, item.Description, cancellationToken);
            responseItems.Add(new StatementItemResponse
            {
                StatementItemId = item.StatementItemId,
                TransactionDate = item.TransactionDate,
                Description = item.Description,
                ItemType = item.ItemType.ToString().ToLowerInvariant(),
                Amount = item.Amount,
                ExternalReference = item.ExternalReference,
                IsDuplicate = item.IsDuplicate,
                IsLinked = item.TransactionId.HasValue,
                TransactionId = item.TransactionId,
                SuggestedCategoryId = sugId,
                SuggestedCategoryName = sugName
            });
        }

        // Send SignalR notification
        if (_notificationSender != null)
        {
            await _notificationSender.SendNotificationToUserAsync(userId, new NotificationResponse
            {
                NotificationId = importJob.ImportJobId,
                Title = "นำเข้าใบแจ้งยอดบัตรเครดิตสำเร็จ",
                Message = $"นำเข้า {statement.Items.Count} รายการ (พบรายการซ้ำ {duplicateCount} รายการ) รอการตรวจสอบ",
                NotificationType = "STATEMENT_IMPORT_REVIEW",
                Channel = "inApp",
                Status = "sent",
                RelatedEntityType = "CreditCardStatement",
                RelatedEntityId = statement.StatementId,
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);
        }

        return new CreditCardStatementImportResponse
        {
            StatementId = statement.StatementId,
            ImportJobId = importJob.ImportJobId,
            CreditCardId = statement.CreditCardId,
            StatementDate = statement.StatementDate,
            StatementPeriodStart = statement.StatementPeriodStart,
            StatementPeriodEnd = statement.StatementPeriodEnd,
            PaymentDueDate = statement.PaymentDueDate,
            PreviousBalance = statement.PreviousBalance,
            PurchaseAmount = statement.PurchaseAmount,
            InstallmentAmount = statement.InstallmentAmount,
            InterestAmount = statement.InterestAmount,
            CashbackAmount = statement.CashbackAmount,
            PaymentAmount = statement.PaymentAmount,
            TotalDue = statement.TotalDue,
            Status = statement.Status.ToString().ToLowerInvariant(),
            TotalItems = statement.Items.Count,
            DuplicateItems = duplicateCount,
            Items = responseItems
        };
    }

    public async Task<IReadOnlyList<CreditCardStatementImportResponse>> GetStatementsByCardIdAsync(
        long userId,
        long creditCardId,
        CancellationToken cancellationToken = default)
    {
        var statements = await _repository.GetStatementsByCardIdAsync(userId, creditCardId, cancellationToken);
        var result = new List<CreditCardStatementImportResponse>();

        foreach (var s in statements)
        {
            var items = s.Items.Select(i => new StatementItemResponse
            {
                StatementItemId = i.StatementItemId,
                TransactionDate = i.TransactionDate,
                Description = i.Description,
                ItemType = i.ItemType.ToString().ToLowerInvariant(),
                Amount = i.Amount,
                ExternalReference = i.ExternalReference,
                IsDuplicate = i.IsDuplicate,
                IsLinked = i.TransactionId.HasValue,
                TransactionId = i.TransactionId
            }).ToList();

            result.Add(new CreditCardStatementImportResponse
            {
                StatementId = s.StatementId,
                ImportJobId = s.ImportJobId,
                CreditCardId = s.CreditCardId,
                CardName = s.CreditCard?.CardName,
                StatementDate = s.StatementDate,
                StatementPeriodStart = s.StatementPeriodStart,
                StatementPeriodEnd = s.StatementPeriodEnd,
                PaymentDueDate = s.PaymentDueDate,
                PreviousBalance = s.PreviousBalance,
                PurchaseAmount = s.PurchaseAmount,
                InstallmentAmount = s.InstallmentAmount,
                InterestAmount = s.InterestAmount,
                CashbackAmount = s.CashbackAmount,
                PaymentAmount = s.PaymentAmount,
                TotalDue = s.TotalDue,
                Status = s.Status.ToString().ToLowerInvariant(),
                TotalItems = s.Items.Count,
                DuplicateItems = s.Items.Count(i => i.IsDuplicate),
                Items = items
            });
        }

        return result;
    }

    public async Task<CreditCardStatementImportResponse?> GetStatementByIdAsync(
        long userId,
        long statementId,
        CancellationToken cancellationToken = default)
    {
        var s = await _repository.GetStatementByIdAsync(userId, statementId, cancellationToken);
        if (s == null) return null;

        var items = new List<StatementItemResponse>();
        foreach (var i in s.Items)
        {
            var (sugId, sugName) = await _repository.SuggestCategoryAsync(userId, i.Description, cancellationToken);
            items.Add(new StatementItemResponse
            {
                StatementItemId = i.StatementItemId,
                TransactionDate = i.TransactionDate,
                Description = i.Description,
                ItemType = i.ItemType.ToString().ToLowerInvariant(),
                Amount = i.Amount,
                ExternalReference = i.ExternalReference,
                IsDuplicate = i.IsDuplicate,
                IsLinked = i.TransactionId.HasValue,
                TransactionId = i.TransactionId,
                SuggestedCategoryId = sugId,
                SuggestedCategoryName = sugName
            });
        }

        return new CreditCardStatementImportResponse
        {
            StatementId = s.StatementId,
            ImportJobId = s.ImportJobId,
            CreditCardId = s.CreditCardId,
            CardName = s.CreditCard?.CardName,
            StatementDate = s.StatementDate,
            StatementPeriodStart = s.StatementPeriodStart,
            StatementPeriodEnd = s.StatementPeriodEnd,
            PaymentDueDate = s.PaymentDueDate,
            PreviousBalance = s.PreviousBalance,
            PurchaseAmount = s.PurchaseAmount,
            InstallmentAmount = s.InstallmentAmount,
            InterestAmount = s.InterestAmount,
            CashbackAmount = s.CashbackAmount,
            PaymentAmount = s.PaymentAmount,
            TotalDue = s.TotalDue,
            Status = s.Status.ToString().ToLowerInvariant(),
            TotalItems = s.Items.Count,
            DuplicateItems = s.Items.Count(i => i.IsDuplicate),
            Items = items
        };
    }

    public async Task<BatchConfirmStatementItemsResponse> ConfirmStatementItemsAsync(
        long userId,
        long statementId,
        ConfirmStatementItemsRequest request,
        CancellationToken cancellationToken = default)
    {
        var statement = await _repository.GetStatementByIdAsync(userId, statementId, cancellationToken);
        if (statement == null)
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบใบแจ้งยอดที่ระบุ");
        }

        if (request.Items.Count == 0)
        {
            throw new BusinessException("VALIDATION_ERROR", "กรุณาเลือกรายการที่ต้องการยืนยันอย่างน้อย 1 รายการ");
        }

        var requestedItemMap = request.Items.ToDictionary(i => i.StatementItemId);
        var itemsToConfirm = await _repository.GetStatementItemsByIdsAsync(requestedItemMap.Keys, cancellationToken);

        var currencyCode = await _repository.GetCurrencyCodeAsync(userId, cancellationToken);
        var createdTxnIds = new List<long>();

        foreach (var item in itemsToConfirm)
        {
            if (item.StatementId != statementId || item.TransactionId.HasValue)
            {
                continue; // Skip if already linked or belongs to another statement
            }

            var itemReq = requestedItemMap[item.StatementItemId];
            var categoryId = itemReq.CategoryId;

            if (!categoryId.HasValue)
            {
                var (sugId, _) = await _repository.SuggestCategoryAsync(userId, itemReq.Description ?? item.Description, cancellationToken);
                categoryId = sugId;
            }

            var isIncome = item.ItemType == StatementItemType.Payment || item.ItemType == StatementItemType.Cashback;
            var txnType = isIncome ? TransactionType.Income : TransactionType.Expense;
            var txnDate = item.TransactionDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

            var transaction = new Transaction
            {
                UserId = userId,
                Amount = item.Amount,
                CurrencyCode = currencyCode,
                TransactionType = txnType,
                TransactionDate = txnDate,
                CategoryId = categoryId,
                CreditCardId = statement.CreditCardId,
                Description = itemReq.Description ?? item.Description,
                SourceType = SourceType.CardStatement,
                Status = TransactionStatus.Confirmed,
                StatementItemId = item.StatementItemId,
                ImportJobId = statement.ImportJobId,
                CreatedAt = DateTime.UtcNow
            };

            await _repository.AddTransactionAsync(transaction, cancellationToken);
            await _repository.SaveChangesAsync(cancellationToken);

            item.TransactionId = transaction.TransactionId;
            createdTxnIds.Add(transaction.TransactionId);
        }

        statement.Status = CreditCardStatementStatus.Reviewed;

        if (statement.ImportJobId.HasValue)
        {
            var job = await _repository.GetImportJobByIdAsync(userId, statement.ImportJobId.Value, cancellationToken);
            if (job != null)
            {
                job.Status = ImportJobStatus.Completed;
                job.ImportedRecords += createdTxnIds.Count;
                job.CompletedAt = DateTime.UtcNow;
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);

        // Send SignalR refresh hint
        if (_notificationSender != null && createdTxnIds.Count > 0)
        {
            await _notificationSender.SendRefreshHintToUserAsync(userId, new RefreshHintPayload
            {
                EntityType = "transaction",
                Hint = "transactions-created-from-statement",
                Timestamp = DateTime.UtcNow
            }, cancellationToken);
        }

        return new BatchConfirmStatementItemsResponse
        {
            StatementId = statementId,
            ConfirmedCount = createdTxnIds.Count,
            CreatedTransactionIds = createdTxnIds
        };
    }
}
