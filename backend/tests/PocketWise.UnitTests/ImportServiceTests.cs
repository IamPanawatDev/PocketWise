using System.Text;
using PocketWise.Application.DTOs;
using PocketWise.Application.DTOs.CategoryRules;
using PocketWise.Application.Features.Imports;
using PocketWise.Application.Features.Imports.DTOs;
using PocketWise.Application.Interfaces;
using PocketWise.Domain.Entities;
using PocketWise.Domain.Enums;
using PocketWise.Domain.Rules;
using PocketWise.Infrastructure.Services;
using Tesseract;

namespace PocketWise.UnitTests;

public class ImportServiceTests
{
    [Theory]
    [InlineData(@"C:\Users\Panawat\Desktop\PocketWise\SlipExam\slip_01.jpeg", "KTB", 1040.00, 2026, 10, 18, 9, 4, "ปนวัฒน์ช", "พรคณา อัศวหน้าเมือง")]
    [InlineData(@"C:\Users\Panawat\Desktop\PocketWise\SlipExam\slip_01.jpg", "KTB", 160.00, 2026, 9, 30, 9, 7, "ปนวัฒน์ช", "ญาดา เกม เซ็นเตอร์")]
    public async Task TestExamSlips(string path, string expectedBank, decimal expectedAmount, int year, int month, int day, int utcHour, int utcMin, string expectedPayer, string expectedPayee)
    {
        if (!File.Exists(path)) return;
        using var stream = File.OpenRead(path);
        var ocr = new TesseractSlipOcrService();
        var result = await ocr.ExtractDataAsync(stream, Path.GetFileName(path), "image/jpeg");

        Assert.Equal(expectedBank, result.BankCode);
        Assert.Equal(expectedAmount, result.DetectedAmount);
        Assert.NotNull(result.DetectedAt);
        Assert.Equal(new DateTime(year, month, day, utcHour, utcMin, 0, DateTimeKind.Utc), result.DetectedAt);
        Assert.Equal(expectedPayer, result.PayerName);
        Assert.Equal(expectedPayee, result.PayeeName);
    }

    [Theory]
    [InlineData("วันที่ทำรายการ 18 ต.ค. 2569 - 16:04", 2026, 10, 18, 9, 4)]
    [InlineData("18 ต.ค. 2569 - 16:04", 2026, 10, 18, 9, 4)]
    [InlineData("วันที่ทำรายการ 30 ก.ย. 2569 - 16:07", 2026, 9, 30, 9, 7)]
    public void TestParsingSlipDateVariations(string line, int expectedYear, int expectedMonth, int expectedDay, int expectedUtcHour, int expectedUtcMin)
    {
        var sampleText = $"""
        โอนเงินสำเร็จ
        รหัสอ้างอิง Ad56e908925d945a1
        จาก นายปนวัฒน์ ช***
        กรุงไทย XXX-X-XX937-7
        ไปยัง นาง พรคณา อัศวหน้าเมือง
        พร้อมเพย์ XXX XXX 0810
        จำนวนเงิน 1,040.00 บาท
        ค่าธรรมเนียม 0.00 บาท
        {line}
        """;

        var ocr = new TesseractSlipOcrService();
        // Use reflection to call private static ParseSlipText
        var method = typeof(TesseractSlipOcrService).GetMethod("ParseSlipText", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        var result = new SlipExtractedData();
        method.Invoke(null, new object[] { sampleText, result });

        Assert.NotNull(result.DetectedAt);
        Assert.Equal(expectedYear, result.DetectedAt.Value.Year);
        Assert.Equal(expectedMonth, result.DetectedAt.Value.Month);
        Assert.Equal(expectedDay, result.DetectedAt.Value.Day);
        Assert.Equal(expectedUtcHour, result.DetectedAt.Value.Hour);
        Assert.Equal(expectedUtcMin, result.DetectedAt.Value.Minute);
    }

    #region Tesseract OCR Real Slip Test

    [Fact]
    public async Task TestOcrOnRealSlip()
    {
        var testFilePath = @"D:\Projects\PocketWise\backend\src\PocketWise.Api\App_Data\uploads\slips\3\202610\84d286adea5e4eb8a99b7ed4bfdab50d.jpg";
        if (!File.Exists(testFilePath)) return;

        using var fileStream = File.OpenRead(testFilePath);
        var ocrService = new TesseractSlipOcrService();
        var result = await ocrService.ExtractDataAsync(fileStream, "slip.jpg", "image/jpeg");

        Assert.Equal(160.00m, result.DetectedAmount);
        Assert.Equal("Ac78eddbe8bd24076", result.TransactionReference);
        Assert.Equal("KTB", result.BankCode);
        Assert.Contains("ญาดา", result.PayeeName);
        Assert.NotNull(result.DetectedAt);
        Assert.Equal(2026, result.DetectedAt.Value.Year);
        Assert.Equal(9, result.DetectedAt.Value.Month);
        Assert.Equal(30, result.DetectedAt.Value.Day);
        // Stored as UTC: 16:07 Bangkok time (UTC+7) = 09:07 UTC
        Assert.Equal(9, result.DetectedAt.Value.Hour);
        Assert.Equal(7, result.DetectedAt.Value.Minute);
    }

    #endregion

    #region StatementParserService Tests

    [Fact]
    public async Task StatementParser_ValidCsv_ParsesCorrectly()
    {
        var parser = new StatementParserService();
        var csvContent = 
            "# statement_date: 2026-10-15\n" +
            "# period_start: 2026-09-16\n" +
            "# period_end: 2026-10-15\n" +
            "# due_date: 2026-11-05\n" +
            "date,description,amount,type,ref\n" +
            "2026-10-01,Starbucks Central,150.00,purchase,TXN001\n" +
            "2026-10-05,Monthly Cashback,50.00,cashback,TXN002\n";

        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(csvContent));
        var result = await parser.ParseStatementAsync(stream, "statement.csv");

        Assert.Equal(new DateOnly(2026, 10, 15), result.StatementDate);
        Assert.Equal(new DateOnly(2026, 9, 16), result.StatementPeriodStart);
        Assert.Equal(new DateOnly(2026, 10, 15), result.StatementPeriodEnd);
        Assert.Equal(new DateOnly(2026, 11, 5), result.PaymentDueDate);
        Assert.Equal(2, result.Items.Count);

        var item1 = result.Items[0];
        Assert.Equal(new DateOnly(2026, 10, 1), item1.TransactionDate);
        Assert.Equal("Starbucks Central", item1.Description);
        Assert.Equal(150.00m, item1.Amount);
        Assert.Equal(StatementItemType.Purchase, item1.ItemType);
        Assert.Equal("TXN001", item1.ExternalReference);

        var item2 = result.Items[1];
        Assert.Equal(StatementItemType.Cashback, item2.ItemType);
        Assert.Equal(50.00m, item2.Amount);

        Assert.Equal(100.00m, result.TotalDue);
    }

    [Fact]
    public async Task StatementParser_ValidJson_ParsesCorrectly()
    {
        var parser = new StatementParserService();
        var jsonContent = """
        {
          "statementDate": "2026-10-18",
          "statementPeriodStart": "2026-09-18",
          "statementPeriodEnd": "2026-10-18",
          "paymentDueDate": "2026-11-05",
          "items": [
            {
              "transactionDate": "2026-10-12",
              "description": "7-Eleven Groceries",
              "amount": 255.50,
              "itemType": "Purchase",
              "externalReference": "REF-711"
            }
          ]
        }
        """;

        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(jsonContent));
        var result = await parser.ParseStatementAsync(stream, "statement.json");

        Assert.Equal(new DateOnly(2026, 10, 18), result.StatementDate);
        Assert.Equal(new DateOnly(2026, 11, 5), result.PaymentDueDate);
        Assert.Single(result.Items);
        Assert.Equal("7-Eleven Groceries", result.Items[0].Description);
        Assert.Equal(255.50m, result.Items[0].Amount);
        Assert.Equal(255.50m, result.TotalDue);
    }

    [Fact]
    public async Task StatementParser_UnsupportedFormat_ThrowsBusinessException()
    {
        var parser = new StatementParserService();
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes("hello"));

        var ex = await Assert.ThrowsAsync<BusinessException>(
            () => parser.ParseStatementAsync(stream, "test.unknown"));

        Assert.Equal("UNSUPPORTED_FORMAT", ex.Code);
    }

    #endregion

    private class FakeMerchantRepository : IMerchantRepository
    {
        public List<Merchant> Merchants { get; } = new();

        public Task<Merchant?> GetByIdAsync(long id, CancellationToken cancellationToken = default) =>
            Task.FromResult(Merchants.FirstOrDefault(m => m.MerchantId == id));

        public Task<IReadOnlyList<Merchant>> GetAllAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Merchant>>(Merchants);

        public Task<IReadOnlyList<Merchant>> SearchByNameAsync(string normalizedName, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Merchant>>(Merchants.Where(m => m.NormalizedName == normalizedName).ToList());

        public Task AddAsync(Merchant merchant, CancellationToken cancellationToken = default)
        {
            merchant.MerchantId = Merchants.Count + 1;
            Merchants.Add(merchant);
            return Task.CompletedTask;
        }

        public Task<bool> CategoryExistsAsync(long categoryId, CancellationToken cancellationToken = default) => Task.FromResult(true);
        public Task UpdateAsync(Merchant merchant, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task DeleteAsync(Merchant merchant, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private class FakeCategoryRuleService : ICategoryRuleService
    {
        public List<(long UserId, string Pattern, long CategoryId)> LearnedRules { get; } = new();

        public Task<IReadOnlyList<CategoryRuleResponse>> GetAllAsync(long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<CategoryRuleResponse>>(Array.Empty<CategoryRuleResponse>());

        public Task<CategoryRuleResponse?> GetByIdAsync(long id, long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<CategoryRuleResponse?>(null);

        public Task<CategoryRuleResponse> CreateAsync(long userId, CreateCategoryRuleRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<CategoryRuleResponse?> UpdateAsync(long id, long userId, UpdateCategoryRuleRequest request, CancellationToken cancellationToken = default) =>
            throw new NotImplementedException();

        public Task<bool> DeleteAsync(long id, long userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(true);

        public Task<CategorySuggestionResponse?> SuggestCategoryAsync(long userId, string description, CancellationToken cancellationToken = default) =>
            Task.FromResult<CategorySuggestionResponse?>(null);

        public Task LearnFromManualAsync(long userId, string description, long categoryId, CancellationToken cancellationToken = default)
        {
            LearnedRules.Add((userId, description, categoryId));
            return Task.CompletedTask;
        }
    }

    #region SlipImportService Tests

    [Fact]
    public async Task SlipImport_UploadSlip_ComputesHashAndDetectsDuplicate()
    {
        var repo = new FakeImportRepository();
        var storage = new FakeFileStorageService();
        var ocr = new FakeSlipOcrService();
        var service = new SlipImportService(repo, storage, ocr);

        var fileBytes = Encoding.UTF8.GetBytes("slip image bytes 12345");
        using var stream1 = new MemoryStream(fileBytes);

        var res1 = await service.UploadSlipAsync(1, stream1, "slip.jpg", "image/jpeg", fileBytes.Length);
        Assert.False(res1.IsDuplicate);
        Assert.Equal("slip.jpg", res1.OriginalFileName);
        Assert.Equal(ReviewStatus.Pending.ToString(), res1.ReviewStatus, ignoreCase: true);
        Assert.Single(repo.Slips);

        // Upload same file bytes again
        using var stream2 = new MemoryStream(fileBytes);
        var res2 = await service.UploadSlipAsync(1, stream2, "slip_copy.jpg", "image/jpeg", fileBytes.Length);

        Assert.True(res2.IsDuplicate);
        Assert.Equal(ReviewStatus.Duplicate.ToString(), res2.ReviewStatus, ignoreCase: true);
    }

    [Fact]
    public async Task SlipImport_ConfirmSlip_CreatesTransactionWithSlipSourceType()
    {
        var repo = new FakeImportRepository();
        var storage = new FakeFileStorageService();
        var ocr = new FakeSlipOcrService();
        var service = new SlipImportService(repo, storage, ocr);

        var bytes = Encoding.UTF8.GetBytes("slip image");
        using var stream = new MemoryStream(bytes);
        var uploadRes = await service.UploadSlipAsync(1, stream, "slip.png", "image/png", bytes.Length);

        var confirmRequest = new ConfirmSlipRequest
        {
            BankAccountId = 10,
            CategoryId = 5,
            Amount = 350.00m,
            TransactionDate = DateTime.UtcNow,
            Description = "Lunch paid via transfer"
        };

        var txn = await service.ConfirmSlipAsync(1, uploadRes.SlipImportFileId, confirmRequest);

        Assert.Equal(SourceType.Slip, txn.SourceType);
        Assert.Equal(350.00m, txn.Amount);
        Assert.Equal(10, txn.BankAccountId);

        var slip = repo.Slips.First(s => s.SlipImportFileId == uploadRes.SlipImportFileId);
        Assert.Equal(ReviewStatus.Confirmed, slip.ReviewStatus);
    }

    [Fact]
    public async Task SlipImport_ConfirmSlip_WithCreditCard_CreatesTransactionWithCreditCardId()
    {
        var repo = new FakeImportRepository();
        var storage = new FakeFileStorageService();
        var ocr = new FakeSlipOcrService();
        var service = new SlipImportService(repo, storage, ocr);

        var bytes = Encoding.UTF8.GetBytes("slip image");
        using var stream = new MemoryStream(bytes);
        var uploadRes = await service.UploadSlipAsync(1, stream, "slip.png", "image/png", bytes.Length);

        var confirmRequest = new ConfirmSlipRequest
        {
            CreditCardId = 42,
            CategoryId = 5,
            Amount = 500.00m,
            TransactionDate = DateTime.UtcNow,
            Description = "Coffee paid via credit card"
        };

        var txn = await service.ConfirmSlipAsync(1, uploadRes.SlipImportFileId, confirmRequest);

        Assert.Equal(SourceType.Slip, txn.SourceType);
        Assert.Equal(500.00m, txn.Amount);
        Assert.Equal(42, txn.CreditCardId);
        Assert.Null(txn.BankAccountId);

        var slip = repo.Slips.First(s => s.SlipImportFileId == uploadRes.SlipImportFileId);
        Assert.Equal(ReviewStatus.Confirmed, slip.ReviewStatus);
    }

    [Fact]
    public async Task SlipImport_ConfirmSlip_RegistersMerchantAndLearnsCategoryRule()
    {
        var repo = new FakeImportRepository();
        var storage = new FakeFileStorageService();
        var ocr = new FakeSlipOcrService();
        var merchantRepo = new FakeMerchantRepository();
        var categoryRuleService = new FakeCategoryRuleService();

        var service = new SlipImportService(
            repo,
            storage,
            ocr,
            null,
            null,
            null,
            categoryRuleService,
            merchantRepo);

        var bytes = Encoding.UTF8.GetBytes("slip content");
        using var stream = new MemoryStream(bytes);
        var uploadRes = await service.UploadSlipAsync(1, stream, "slip.png", "image/png", bytes.Length);

        var confirmRequest = new ConfirmSlipRequest
        {
            BankAccountId = 10,
            CategoryId = 7,
            Amount = 500.00m,
            TransactionDate = DateTime.UtcNow,
            PayeeName = "Cafe Amazon PTT",
            Description = "ซื้อกาแฟอเมซอน"
        };

        var txn = await service.ConfirmSlipAsync(1, uploadRes.SlipImportFileId, confirmRequest);

        Assert.NotNull(txn);
        Assert.Single(merchantRepo.Merchants);
        Assert.Equal("Cafe Amazon PTT", merchantRepo.Merchants[0].MerchantName);
        Assert.Equal(7, merchantRepo.Merchants[0].DefaultCategoryId);

        Assert.NotEmpty(categoryRuleService.LearnedRules);
        Assert.Contains(categoryRuleService.LearnedRules, r => r.UserId == 1 && r.CategoryId == 7);
    }

    [Fact]
    public async Task SlipImport_RejectSlip_UpdatesStatusToRejected()
    {
        var repo = new FakeImportRepository();
        var storage = new FakeFileStorageService();
        var ocr = new FakeSlipOcrService();
        var service = new SlipImportService(repo, storage, ocr);

        var bytes = Encoding.UTF8.GetBytes("slip to reject");
        using var stream = new MemoryStream(bytes);
        var uploadRes = await service.UploadSlipAsync(1, stream, "bad_slip.png", "image/png", bytes.Length);

        await service.RejectSlipAsync(1, uploadRes.SlipImportFileId);

        var slip = repo.Slips.First(s => s.SlipImportFileId == uploadRes.SlipImportFileId);
        Assert.Equal(ReviewStatus.Rejected, slip.ReviewStatus);
    }

    #endregion

    #region StatementImportService Tests

    [Fact]
    public async Task StatementImport_DetectsDuplicates_And_CreatesImportJob()
    {
        var repo = new FakeImportRepository();
        repo.ValidCardIds.Add(99);
        repo.UserCardMap[99] = 1;
        // Pretend there is already a transaction matching TXN001
        repo.DuplicateKeys.Add((99, new DateOnly(2026, 10, 1), 150.00m, "TXN001"));

        var parser = new StatementParserService();
        var service = new StatementImportService(repo, parser);

        var csvContent = 
            "# statement_date: 2026-10-15\n" +
            "date,description,amount,type,ref\n" +
            "2026-10-01,Starbucks Central,150.00,purchase,TXN001\n" +
            "2026-10-02,BTS Rabbit Card,200.00,purchase,TXN002\n";

        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(csvContent));
        var res = await service.ImportStatementAsync(1, 99, stream, "october.csv");

        Assert.Equal(2, res.TotalItems);
        Assert.Equal(1, res.DuplicateItems);
        Assert.Single(repo.Statements);
        Assert.Single(repo.ImportJobs);

        var stmt = repo.Statements[0];
        Assert.Equal(2, stmt.Items.Count);

        var dupItem = stmt.Items.First(i => i.ExternalReference == "TXN001");
        Assert.True(dupItem.IsDuplicate);

        var nonDupItem = stmt.Items.First(i => i.ExternalReference == "TXN002");
        Assert.False(nonDupItem.IsDuplicate);
    }

    [Fact]
    public async Task StatementImport_ConfirmItems_CreatesTransactionsWithCardStatementSourceType()
    {
        var repo = new FakeImportRepository();
        repo.ValidCardIds.Add(99);
        repo.UserCardMap[99] = 1;

        var parser = new StatementParserService();
        var service = new StatementImportService(repo, parser);

        var csvContent = 
            "# statement_date: 2026-10-15\n" +
            "date,description,amount,type,ref\n" +
            "2026-10-02,BTS Rabbit Card,200.00,purchase,TXN002\n";

        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(csvContent));
        var importRes = await service.ImportStatementAsync(1, 99, stream, "october.csv");

        var item = importRes.Items[0];
        var confirmReq = new ConfirmStatementItemsRequest
        {
            Items =
            [
                new ConfirmStatementItemDto
                {
                    StatementItemId = item.StatementItemId,
                    CategoryId = 7,
                    Description = "BTS Transit"
                }
            ]
        };

        var confirmRes = await service.ConfirmStatementItemsAsync(1, importRes.StatementId, confirmReq);

        Assert.Equal(1, confirmRes.ConfirmedCount);
        Assert.Single(repo.Transactions);

        var txn = repo.Transactions[0];
        Assert.Equal(SourceType.CardStatement, txn.SourceType);
        Assert.Equal(200.00m, txn.Amount);
        Assert.Equal(99, txn.CreditCardId);
        Assert.Equal(7, txn.CategoryId);

        var updatedItem = repo.StatementItems.First(i => i.StatementItemId == item.StatementItemId);
        Assert.Equal(txn.TransactionId, updatedItem.TransactionId);
    }

    #endregion

    #region Fakes

    private class FakeFileStorageService : IFileStorageService
    {
        private readonly Dictionary<string, (byte[] Data, string ContentType, string FileName)> _files = new();

        public Task<string> SaveFileAsync(Stream fileStream, string fileName, string contentType, string subFolder, CancellationToken cancellationToken = default)
        {
            using var ms = new MemoryStream();
            fileStream.CopyTo(ms);
            var key = $"{subFolder}/{Guid.NewGuid()}_{fileName}";
            _files[key] = (ms.ToArray(), contentType, fileName);
            return Task.FromResult(key);
        }

        public Task<(Stream Stream, string ContentType, string FileName)?> GetFileAsync(string storageKey, CancellationToken cancellationToken = default)
        {
            if (_files.TryGetValue(storageKey, out var item))
            {
                return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>((new MemoryStream(item.Data), item.ContentType, item.FileName));
            }
            return Task.FromResult<(Stream Stream, string ContentType, string FileName)?>(null);
        }

        public Task<bool> DeleteFileAsync(string storageKey, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_files.Remove(storageKey));
        }
    }

    private class FakeSlipOcrService : ISlipOcrService
    {
        public Task<SlipExtractedData> ExtractDataAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new SlipExtractedData
            {
                DetectedAmount = 350.00m,
                DetectedAt = DateTime.UtcNow,
                PayeeName = "ร้านกาแฟดี",
                TransactionReference = "REF998811"
            });
        }
    }

    private class FakeImportRepository : IImportRepository
    {
        public List<ImportJob> ImportJobs { get; } = new();
        public List<SlipImportFile> Slips { get; } = new();
        public List<CreditCardStatement> Statements { get; } = new();
        public List<CreditCardStatementItem> StatementItems { get; } = new();
        public List<Transaction> Transactions { get; } = new();

        public HashSet<long> ValidCardIds { get; } = new();
        public Dictionary<long, long> UserCardMap { get; } = new();
        public HashSet<(long CardId, DateOnly Date, decimal Amount, string? Ref)> DuplicateKeys { get; } = new();

        private long _idCounter = 1;

        public Task AddImportJobAsync(ImportJob job, CancellationToken cancellationToken = default)
        {
            job.ImportJobId = _idCounter++;
            ImportJobs.Add(job);
            return Task.CompletedTask;
        }

        public Task<ImportJob?> GetImportJobByIdAsync(long userId, long jobId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ImportJobs.FirstOrDefault(j => j.UserId == userId && j.ImportJobId == jobId));
        }

        public Task<PagedResult<ImportJob>> GetImportJobsPagedAsync(long userId, int page, int pageSize, ImportType? type, CancellationToken cancellationToken = default)
        {
            var query = ImportJobs.Where(j => j.UserId == userId);
            if (type.HasValue) query = query.Where(j => j.ImportType == type.Value);
            var items = query.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(new PagedResult<ImportJob>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = query.Count(),
                TotalPages = (int)Math.Ceiling(query.Count() / (double)pageSize)
            });
        }

        public Task AddSlipImportFileAsync(SlipImportFile slip, CancellationToken cancellationToken = default)
        {
            slip.SlipImportFileId = _idCounter++;
            Slips.Add(slip);
            return Task.CompletedTask;
        }

        public Task<SlipImportFile?> GetSlipByIdAsync(long userId, long slipId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Slips.FirstOrDefault(s => s.UserId == userId && s.SlipImportFileId == slipId));
        }

        public Task<SlipImportFile?> GetSlipByHashAsync(long userId, string fileHash, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Slips.FirstOrDefault(s => s.UserId == userId && s.FileHash == fileHash));
        }

        public Task AddStatementAsync(CreditCardStatement statement, CancellationToken cancellationToken = default)
        {
            statement.StatementId = _idCounter++;
            foreach (var item in statement.Items)
            {
                item.StatementItemId = _idCounter++;
                item.StatementId = statement.StatementId;
                StatementItems.Add(item);
            }
            Statements.Add(statement);
            return Task.CompletedTask;
        }

        public Task<CreditCardStatement?> GetStatementByIdAsync(long userId, long statementId, CancellationToken cancellationToken = default)
        {
            var stmt = Statements.FirstOrDefault(s => s.StatementId == statementId && UserCardMap.TryGetValue(s.CreditCardId, out var uid) && uid == userId);
            if (stmt != null && stmt.Items.Count == 0)
            {
                stmt.Items = StatementItems.Where(i => i.StatementId == stmt.StatementId).ToList();
            }
            return Task.FromResult(stmt);
        }

        public Task<IReadOnlyList<CreditCardStatement>> GetStatementsByCardIdAsync(long userId, long cardId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<CreditCardStatement>>(
                Statements.Where(s => s.CreditCardId == cardId && UserCardMap.TryGetValue(s.CreditCardId, out var uid) && uid == userId).ToList());
        }

        public Task<CreditCardStatementItem?> GetStatementItemByIdAsync(long statementItemId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(StatementItems.FirstOrDefault(i => i.StatementItemId == statementItemId));
        }

        public Task<IReadOnlyList<CreditCardStatementItem>> GetStatementItemsByIdsAsync(IEnumerable<long> statementItemIds, CancellationToken cancellationToken = default)
        {
            var ids = statementItemIds.ToHashSet();
            return Task.FromResult<IReadOnlyList<CreditCardStatementItem>>(
                StatementItems.Where(i => ids.Contains(i.StatementItemId)).ToList());
        }

        public Task<bool> HasDuplicateItemAsync(long creditCardId, DateOnly transactionDate, decimal amount, string? externalReference, CancellationToken cancellationToken = default)
        {
            var dup = DuplicateKeys.Contains((creditCardId, transactionDate, amount, externalReference));
            return Task.FromResult(dup);
        }

        public Task AddTransactionAsync(Transaction transaction, CancellationToken cancellationToken = default)
        {
            transaction.TransactionId = _idCounter++;
            Transactions.Add(transaction);
            return Task.CompletedTask;
        }

        public Task AddTransactionsAsync(IEnumerable<Transaction> transactions, CancellationToken cancellationToken = default)
        {
            foreach (var t in transactions)
            {
                t.TransactionId = _idCounter++;
                Transactions.Add(t);
            }
            return Task.CompletedTask;
        }

        public Task<(long? CategoryId, string? CategoryName)> SuggestCategoryAsync(long userId, string? text, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<(long?, string?)>((null, null));
        }

        public Task<bool> CreditCardExistsAsync(long userId, long creditCardId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(ValidCardIds.Contains(creditCardId) && UserCardMap.TryGetValue(creditCardId, out var uid) && uid == userId);
        }

        public Task<string> GetCurrencyCodeAsync(long userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult("THB");
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    #endregion
}
