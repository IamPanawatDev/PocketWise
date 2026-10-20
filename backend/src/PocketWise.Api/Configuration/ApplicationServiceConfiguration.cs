using FluentValidation;
using PocketWise.Api.Authentication;
using PocketWise.Api.Services;
using PocketWise.Application.Features.Notifications;
using PocketWise.Application.Features.Imports;
using PocketWise.Infrastructure.Services;
using PocketWise.Application.DTOs.Auth;
using PocketWise.Application.DTOs.BankAccounts;
using PocketWise.Application.DTOs.Budgets;
using PocketWise.Application.DTOs.Categories;
using PocketWise.Application.DTOs.CategoryRules;
using PocketWise.Application.DTOs.CreditCards;
using PocketWise.Application.DTOs.Merchants;
using PocketWise.Application.DTOs.Tags;
using PocketWise.Application.DTOs.RecurringTransactions;
using PocketWise.Application.DTOs.Reports;
using PocketWise.Application.DTOs.Settings;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.DTOs.Transfers;
using PocketWise.Application.Features.Auth;
using PocketWise.Application.Features.BankAccounts;
using PocketWise.Application.Features.Budgets;
using PocketWise.Application.Features.Categories;
using PocketWise.Application.Features.CategoryRules;
using PocketWise.Application.Features.CreditCards;
using PocketWise.Application.Features.Merchants;
using PocketWise.Application.Features.RecurringTransactions;
using PocketWise.Application.Features.Reports;
using PocketWise.Application.Features.Settings;
using PocketWise.Application.Features.Tags;
using PocketWise.Application.Features.Transactions;
using PocketWise.Application.Features.Transfers;
using PocketWise.Application.Interfaces;
using PocketWise.Application.Validators;
using PocketWise.Infrastructure.Repositories;

namespace PocketWise.Api.Configuration;

public static class ApplicationServiceConfiguration
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IUserRefreshTokenRepository, UserRefreshTokenRepository>();
        services.AddScoped<IUserSettingsRepository, UserSettingsRepository>();

        // Repositories
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ITagRepository, TagRepository>();
        services.AddScoped<IBankAccountRepository, BankAccountRepository>();
        services.AddScoped<ITransferRepository, TransferRepository>();
        services.AddScoped<IBudgetRepository, BudgetRepository>();
        services.AddScoped<ICreditCardRepository, CreditCardRepository>();
        services.AddScoped<IRecurringTransactionRepository, RecurringTransactionRepository>();
        services.AddScoped<IReportRepository, ReportRepository>();
        services.AddScoped<IMerchantRepository, MerchantRepository>();
        services.AddScoped<ICategoryRuleRepository, CategoryRuleRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<IImportRepository, ImportRepository>();

        // Services
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<IBankAccountService, BankAccountService>();
        services.AddScoped<ITransferService, TransferService>();
        services.AddScoped<IBudgetService, BudgetService>();
        services.AddScoped<ICreditCardService, CreditCardService>();
        services.AddScoped<IRecurringTransactionService, RecurringTransactionService>();
        services.AddScoped<IReportService, ReportService>();
        services.AddScoped<IMerchantService, MerchantService>();
        services.AddScoped<ICategoryRuleService, CategoryRuleService>();
        services.AddScoped<IUserSettingsService, UserSettingsService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<INotificationSender, SignalRNotificationSender>();

        // Import Services
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<ISlipOcrService, TesseractSlipOcrService>();
        services.AddScoped<IStatementParserService, StatementParserService>();
        services.AddScoped<ISlipImportService, SlipImportService>();
        services.AddScoped<IStatementImportService, StatementImportService>();
        services.AddScoped<IImportJobService, ImportJobService>();

        // Validators
        services.AddScoped<IValidator<CreateTransactionRequest>, CreateTransactionValidator>();
        services.AddScoped<IValidator<UpdateTransactionRequest>, UpdateTransactionValidator>();
        services.AddScoped<IValidator<CreateCategoryRequest>, CreateCategoryValidator>();
        services.AddScoped<IValidator<UpdateCategoryRequest>, UpdateCategoryValidator>();
        services.AddScoped<IValidator<CreateTagRequest>, CreateTagValidator>();
        services.AddScoped<IValidator<UpdateTagRequest>, UpdateTagValidator>();
        services.AddScoped<IValidator<CreateBankAccountRequest>, CreateBankAccountValidator>();
        services.AddScoped<IValidator<UpdateBankAccountRequest>, UpdateBankAccountValidator>();
        services.AddScoped<IValidator<CreateTransferRequest>, CreateTransferValidator>();
        services.AddScoped<IValidator<CreateBudgetRequest>, CreateBudgetValidator>();
        services.AddScoped<IValidator<UpdateBudgetRequest>, UpdateBudgetValidator>();
        services.AddScoped<IValidator<CreateCreditCardRequest>, CreateCreditCardValidator>();
        services.AddScoped<IValidator<UpdateCreditCardRequest>, UpdateCreditCardValidator>();
        services.AddScoped<IValidator<CreateRecurringTransactionRequest>, CreateRecurringTransactionValidator>();
        services.AddScoped<IValidator<UpdateRecurringTransactionRequest>, UpdateRecurringTransactionValidator>();
        services.AddScoped<IValidator<CreateMerchantRequest>, CreateMerchantValidator>();
        services.AddScoped<IValidator<UpdateMerchantRequest>, UpdateMerchantValidator>();
        services.AddScoped<IValidator<CreateCategoryRuleRequest>, CreateCategoryRuleValidator>();
        services.AddScoped<IValidator<UpdateCategoryRuleRequest>, UpdateCategoryRuleValidator>();
        services.AddScoped<IValidator<UpdateUserProfileRequest>, UpdateUserProfileValidator>();
        services.AddScoped<IValidator<UpdateUserSettingsRequest>, UpdateUserSettingsValidator>();

        return services;
    }
}
