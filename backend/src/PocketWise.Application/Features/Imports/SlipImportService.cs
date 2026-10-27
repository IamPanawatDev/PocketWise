using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Features.Notifications.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;

namespace PocketWise.Application.Features.Imports;

public class SlipImportService : ISlipImportService
{
    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf"
    };

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    private readonly IImportRepository _repository;
    private readonly IFileStorageService _fileStorageService;
    private readonly ISlipOcrService _ocrService;
    private readonly INotificationSender? _notificationSender;
    private readonly IAuditLogService? _auditLogService;
    private readonly ILogger<SlipImportService>? _logger;
    private readonly ICategoryRuleService? _categoryRuleService;
    private readonly IMerchantRepository? _merchantRepository;

    public SlipImportService(
        IImportRepository repository,
        IFileStorageService fileStorageService,
        ISlipOcrService ocrService,
        INotificationSender? notificationSender = null,
        IAuditLogService? auditLogService = null,
        ILogger<SlipImportService>? logger = null,
        ICategoryRuleService? categoryRuleService = null,
        IMerchantRepository? merchantRepository = null)
    {
        _repository = repository;
        _fileStorageService = fileStorageService;
        _ocrService = ocrService;
        _notificationSender = notificationSender;
        _auditLogService = auditLogService;
        _logger = logger;
        _categoryRuleService = categoryRuleService;
        _merchantRepository = merchantRepository;
    }

    public async Task<SlipImportResponse> UploadSlipAsync(
        long userId,
        Stream fileStream,
        string fileName,
        string contentType,
        long fileSize,
        string? bankCode = null,
        CancellationToken cancellationToken = default)
    {
        if (fileSize <= 0)
        {
            throw new BusinessException("VALIDATION_ERROR", "ขนาดไฟล์ต้องมากกว่า 0 ไบต์");
        }

        if (fileSize > MaxFileSizeBytes)
        {
            throw new BusinessException("VALIDATION_ERROR", "ขนาดไฟล์ต้องไม่เกิน 10 MB");
        }

        if (!AllowedMimeTypes.Contains(contentType))
        {
            throw new BusinessException("VALIDATION_ERROR", "รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WEBP) หรือ PDF เท่านั้น");
        }

        _logger?.LogInformation("[SlipImportService] Processing slip upload: FileName='{FileName}', Size={Size} bytes, Mime='{Mime}', UserId={UserId}", fileName, fileSize, contentType, userId);

        // Calculate SHA-256 Hash for duplicate file detection
        using var sha256 = SHA256.Create();
        fileStream.Seek(0, SeekOrigin.Begin);
        var hashBytes = await sha256.ComputeHashAsync(fileStream, cancellationToken);
        var fileHash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        // Check if duplicate file already exists for this user
        var existingSlip = await _repository.GetSlipByHashAsync(userId, fileHash, cancellationToken);
        var isDuplicate = existingSlip != null;

        // Save file to storage
        var subFolder = Path.Combine("slips", userId.ToString(), DateTime.UtcNow.ToString("yyyyMM"));
        var storageKey = await _fileStorageService.SaveFileAsync(fileStream, fileName, contentType, subFolder, cancellationToken);

        // Run OCR / extraction
        fileStream.Seek(0, SeekOrigin.Begin);
        var extracted = await _ocrService.ExtractDataAsync(fileStream, fileName, contentType, cancellationToken);

        if (!string.IsNullOrWhiteSpace(bankCode))
        {
            extracted.BankCode = bankCode;
        }

        _logger?.LogInformation("[SlipImportService] OCR extraction finished: Bank={Bank}, Amount={Amt}, Date={Date}, Payer={Payer}, Payee={Payee}, Ref={Ref}",
            extracted.BankCode, extracted.DetectedAmount, extracted.DetectedAt, extracted.PayerName, extracted.PayeeName, extracted.TransactionReference);

        // Suggest category
        var (suggestedCatId, suggestedCatName) = await _repository.SuggestCategoryAsync(
            userId,
            extracted.PayeeName ?? extracted.PayerName ?? Path.GetFileNameWithoutExtension(fileName),
            cancellationToken);

        // Create ImportJob
        var importJob = new ImportJob
        {
            UserId = userId,
            ImportType = ImportType.Slip,
            FileName = fileName,
            Status = ImportJobStatus.NeedsReview,
            TotalRecords = 1,
            ImportedRecords = 0,
            DuplicateRecords = isDuplicate ? 1 : 0,
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        await _repository.AddImportJobAsync(importJob, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        // Create SlipImportFile
        var slip = new SlipImportFile
        {
            UserId = userId,
            ImportJobId = importJob.ImportJobId,
            StorageKey = storageKey,
            OriginalFileName = fileName,
            MimeType = contentType,
            FileSizeBytes = fileSize,
            BankCode = extracted.BankCode,
            PayerName = extracted.PayerName,
            PayeeName = extracted.PayeeName,
            DetectedAmount = extracted.DetectedAmount,
            DetectedAt = extracted.DetectedAt,
            TransactionReference = extracted.TransactionReference,
            FileHash = fileHash,
            ReviewStatus = isDuplicate ? ReviewStatus.Duplicate : ReviewStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        await _repository.AddSlipImportFileAsync(slip, cancellationToken);
        await _repository.SaveChangesAsync(cancellationToken);

        // Send SignalR notification
        if (_notificationSender != null)
        {
            var notifTitle = isDuplicate ? "พบสลิปซ้ำในระบบ" : "อัปโหลดสลิปสำเร็จ รอการตรวจสอบ";
            var notifMsg = isDuplicate
                ? $"ไฟล์ {fileName} ตรงกับสลิปที่เคยอัปโหลดแล้ว"
                : $"สลิป {fileName} จำนวนเงิน {(extracted.DetectedAmount.HasValue ? extracted.DetectedAmount.Value.ToString("N2") : "-")} พร้อมตรวจสอบ";

            await _notificationSender.SendNotificationToUserAsync(userId, new NotificationResponse
            {
                NotificationId = importJob.ImportJobId,
                Title = notifTitle,
                Message = notifMsg,
                NotificationType = isDuplicate ? "SLIP_IMPORT_DUPLICATE" : "SLIP_IMPORT_REVIEW",
                Channel = "inApp",
                Status = "sent",
                RelatedEntityType = "Slip",
                RelatedEntityId = slip.SlipImportFileId,
                CreatedAt = DateTime.UtcNow
            }, cancellationToken);
        }

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Import,
                "SlipImportFiles",
                slip.SlipImportFileId.ToString(),
                new
                {
                    slip.OriginalFileName,
                    slip.FileSizeBytes,
                    slip.DetectedAmount,
                    slip.BankCode,
                    slip.PayeeName,
                    slip.PayerName,
                    ReviewStatus = slip.ReviewStatus.ToString()
                },
                cancellationToken);
        }

        return new SlipImportResponse
        {
            SlipImportFileId = slip.SlipImportFileId,
            ImportJobId = importJob.ImportJobId,
            OriginalFileName = slip.OriginalFileName,
            FileSizeBytes = slip.FileSizeBytes,
            FileHash = slip.FileHash,
            BankCode = slip.BankCode,
            PayerName = slip.PayerName,
            PayeeName = slip.PayeeName,
            DetectedAmount = slip.DetectedAmount,
            DetectedAt = slip.DetectedAt,
            TransactionReference = slip.TransactionReference,
            ReviewStatus = slip.ReviewStatus.ToString().ToLowerInvariant(),
            IsDuplicate = isDuplicate,
            SuggestedCategoryId = suggestedCatId,
            SuggestedCategoryName = suggestedCatName,
            CreatedAt = slip.CreatedAt
        };
    }

    public async Task<SlipImportResponse?> GetSlipByIdAsync(
        long userId,
        long slipId,
        CancellationToken cancellationToken = default)
    {
        var slip = await _repository.GetSlipByIdAsync(userId, slipId, cancellationToken);
        if (slip == null) return null;

        var (suggestedCatId, suggestedCatName) = await _repository.SuggestCategoryAsync(
            userId,
            slip.PayeeName ?? slip.PayerName ?? slip.OriginalFileName,
            cancellationToken);

        return new SlipImportResponse
        {
            SlipImportFileId = slip.SlipImportFileId,
            ImportJobId = slip.ImportJobId,
            OriginalFileName = slip.OriginalFileName,
            FileSizeBytes = slip.FileSizeBytes,
            FileHash = slip.FileHash,
            BankCode = slip.BankCode,
            PayerName = slip.PayerName,
            PayeeName = slip.PayeeName,
            DetectedAmount = slip.DetectedAmount,
            DetectedAt = slip.DetectedAt,
            TransactionReference = slip.TransactionReference,
            ReviewStatus = slip.ReviewStatus.ToString().ToLowerInvariant(),
            IsDuplicate = slip.ReviewStatus == ReviewStatus.Duplicate,
            SuggestedCategoryId = suggestedCatId,
            SuggestedCategoryName = suggestedCatName,
            CreatedAt = slip.CreatedAt
        };
    }

    public async Task<(Stream Stream, string ContentType, string FileName)?> GetSlipFileStreamAsync(
        long userId,
        long slipId,
        CancellationToken cancellationToken = default)
    {
        var slip = await _repository.GetSlipByIdAsync(userId, slipId, cancellationToken);
        if (slip == null) return null;

        return await _fileStorageService.GetFileAsync(slip.StorageKey, cancellationToken);
    }

    public async Task<TransactionResponse> ConfirmSlipAsync(
        long userId,
        long slipId,
        ConfirmSlipRequest request,
        CancellationToken cancellationToken = default)
    {
        var slip = await _repository.GetSlipByIdAsync(userId, slipId, cancellationToken);
        if (slip == null)
        {
            throw new BusinessException("NOT_FOUND", "ไม่พบสลิปที่ระบุ");
        }

        if (slip.ReviewStatus == ReviewStatus.Confirmed)
        {
            throw new BusinessException("CONFLICT", "สลิปนี้ได้รับการยืนยันและสร้างรายการไปแล้ว");
        }

        if (request.Amount <= 0)
        {
            throw new BusinessException("VALIDATION_ERROR", "จำนวนเงินต้องมากกว่า 0");
        }

        var currencyCode = await _repository.GetCurrencyCodeAsync(userId, cancellationToken);
        var categoryId = request.CategoryId.HasValue && request.CategoryId.Value > 0 ? request.CategoryId : null;
        var bankAccountId = request.BankAccountId.HasValue && request.BankAccountId.Value > 0 ? request.BankAccountId : null;
        var creditCardId = request.CreditCardId.HasValue && request.CreditCardId.Value > 0 ? request.CreditCardId : null;

        // Auto-categorize if user didn't specify category
        if (!categoryId.HasValue)
        {
            var (suggestedId, _) = await _repository.SuggestCategoryAsync(userId, request.Description ?? slip.PayeeName, cancellationToken);
            if (suggestedId.HasValue && suggestedId.Value > 0)
            {
                categoryId = suggestedId;
            }
        }

        long? merchantId = null;
        var payee = !string.IsNullOrWhiteSpace(request.PayeeName) ? request.PayeeName.Trim() : slip.PayeeName?.Trim();
        if (!string.IsNullOrWhiteSpace(payee) && _merchantRepository != null)
        {
            try
            {
                var normalized = new string(payee.ToLowerInvariant().Where(c => !char.IsWhiteSpace(c)).ToArray());
                var matches = await _merchantRepository.SearchByNameAsync(normalized, cancellationToken);
                var existingMerchant = matches.FirstOrDefault(m => m.NormalizedName == normalized);
                if (existingMerchant != null)
                {
                    merchantId = existingMerchant.MerchantId > 0 ? existingMerchant.MerchantId : null;
                    if (!existingMerchant.DefaultCategoryId.HasValue && categoryId.HasValue)
                    {
                        existingMerchant.DefaultCategoryId = categoryId;
                        await _merchantRepository.UpdateAsync(existingMerchant, cancellationToken);
                        await _merchantRepository.SaveChangesAsync(cancellationToken);
                    }
                }
                else
                {
                    var newMerchant = new Merchant
                    {
                        MerchantName = payee,
                        NormalizedName = normalized,
                        DefaultCategoryId = categoryId,
                        BankOrProvider = slip.BankCode,
                        IsVerified = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _merchantRepository.AddAsync(newMerchant, cancellationToken);
                    await _merchantRepository.SaveChangesAsync(cancellationToken);
                    if (newMerchant.MerchantId > 0)
                    {
                        merchantId = newMerchant.MerchantId;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to register merchant for payee '{Payee}'", payee);
                merchantId = null;
            }
        }

        var transaction = new Transaction
        {
            UserId = userId,
            Amount = request.Amount,
            CurrencyCode = currencyCode,
            TransactionType = TransactionType.Expense,
            TransactionDate = request.TransactionDate != default
                ? DateTime.SpecifyKind(request.TransactionDate, DateTimeKind.Utc)
                : DateTime.UtcNow,
            CategoryId = categoryId,
            BankAccountId = bankAccountId,
            CreditCardId = creditCardId,
            MerchantId = merchantId > 0 ? merchantId : null,
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? (slip.PayeeName ?? "โอนเงินจากสลิป")
                : request.Description,
            SourceType = SourceType.Slip,
            Status = TransactionStatus.Confirmed,
            SlipImportFileId = slip.SlipImportFileId,
            ImportJobId = slip.ImportJobId,
            CreatedAt = DateTime.UtcNow
        };

        if (request.TagIds is { Count: > 0 })
        {
            var validTagIds = request.TagIds.Where(id => id > 0).Distinct().ToList();
            if (validTagIds.Count > 0)
            {
                transaction.TransactionTags = validTagIds
                    .Select(tagId => new TransactionTag { TagId = tagId })
                    .ToList();
            }
        }

        await _repository.AddTransactionAsync(transaction, cancellationToken);

        // Update slip and job
        slip.ReviewStatus = ReviewStatus.Confirmed;
        if (request.Amount > 0) slip.DetectedAmount = request.Amount;
        if (!string.IsNullOrWhiteSpace(request.PayeeName)) slip.PayeeName = request.PayeeName;
        if (!string.IsNullOrWhiteSpace(request.PayerName)) slip.PayerName = request.PayerName;
        if (!string.IsNullOrWhiteSpace(request.TransactionReference)) slip.TransactionReference = request.TransactionReference;

        if (slip.ImportJobId.HasValue)
        {
            var job = await _repository.GetImportJobByIdAsync(userId, slip.ImportJobId.Value, cancellationToken);
            if (job != null)
            {
                job.Status = ImportJobStatus.Completed;
                job.ImportedRecords = 1;
                job.CompletedAt = DateTime.UtcNow;
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);

        // Auto-learn categorization rule (Items 3 & 9)
        if (_categoryRuleService != null && categoryId.HasValue)
        {
            var pattern = !string.IsNullOrWhiteSpace(transaction.Description) ? transaction.Description : payee;
            if (!string.IsNullOrWhiteSpace(pattern))
            {
                try
                {
                    await _categoryRuleService.LearnFromManualAsync(userId, pattern, categoryId.Value, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to learn auto-categorization rule for pattern '{Pattern}'", pattern);
                }
            }

            if (!string.IsNullOrWhiteSpace(payee) && !string.Equals(payee, pattern, StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    await _categoryRuleService.LearnFromManualAsync(userId, payee, categoryId.Value, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to learn auto-categorization rule for payee '{Payee}'", payee);
                }
            }
        }

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Import,
                "Transactions",
                transaction.TransactionId.ToString(),
                new
                {
                    SlipImportFileId = slip.SlipImportFileId,
                    slip.OriginalFileName,
                    transaction.Amount,
                    transaction.CurrencyCode,
                    transaction.Description,
                    transaction.CategoryId,
                    transaction.BankAccountId,
                    transaction.CreditCardId,
                    Source = "SlipImport"
                },
                cancellationToken);
        }

        // Send SignalR refresh hint
        if (_notificationSender != null)
        {
            await _notificationSender.SendRefreshHintToUserAsync(userId, new RefreshHintPayload
            {
                EntityType = "transaction",
                Hint = "transaction-created-from-slip",
                Timestamp = DateTime.UtcNow
            }, cancellationToken);
        }

        return new TransactionResponse
        {
            TransactionId = transaction.TransactionId,
            Amount = transaction.Amount,
            CurrencyCode = transaction.CurrencyCode,
            TransactionType = TransactionType.Expense,
            TransactionDate = transaction.TransactionDate,
            CategoryId = transaction.CategoryId,
            BankAccountId = transaction.BankAccountId,
            CreditCardId = transaction.CreditCardId,
            Description = transaction.Description,
            Tags = transaction.TransactionTags
                .Select(t => new TagRef { TagId = t.TagId, TagName = string.Empty })
                .ToList(),
            SourceType = SourceType.Slip,
            Status = TransactionStatus.Confirmed,
            CreatedAt = transaction.CreatedAt
        };
    }

    public async Task<bool> RejectSlipAsync(
        long userId,
        long slipId,
        CancellationToken cancellationToken = default)
    {
        var slip = await _repository.GetSlipByIdAsync(userId, slipId, cancellationToken);
        if (slip == null) return false;

        slip.ReviewStatus = ReviewStatus.Rejected;

        if (slip.ImportJobId.HasValue)
        {
            var job = await _repository.GetImportJobByIdAsync(userId, slip.ImportJobId.Value, cancellationToken);
            if (job != null)
            {
                job.Status = ImportJobStatus.Completed;
                job.CompletedAt = DateTime.UtcNow;
            }
        }

        await _repository.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.LogAsync(
                userId,
                AuditAction.Update,
                "SlipImportFiles",
                slipId.ToString(),
                new { slip.OriginalFileName, ReviewStatus = "Rejected" },
                cancellationToken);
        }

        return true;
    }
}

