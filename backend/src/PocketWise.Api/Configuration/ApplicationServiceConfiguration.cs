using FluentValidation;
using PocketWise.Api.Authentication;
using PocketWise.Application.DTOs.BankAccounts;
using PocketWise.Application.DTOs.Categories;
using PocketWise.Application.DTOs.Tags;
using PocketWise.Application.DTOs.Transactions;
using PocketWise.Application.DTOs.Transfers;
using PocketWise.Application.Features.Auth;
using PocketWise.Application.Features.BankAccounts;
using PocketWise.Application.Features.Categories;
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

        // Repositories
        services.AddScoped<ITransactionRepository, TransactionRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<ITagRepository, TagRepository>();
        services.AddScoped<IBankAccountRepository, BankAccountRepository>();
        services.AddScoped<ITransferRepository, TransferRepository>();

        // Services
        services.AddScoped<ITransactionService, TransactionService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<ITagService, TagService>();
        services.AddScoped<IBankAccountService, BankAccountService>();
        services.AddScoped<ITransferService, TransferService>();

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

        return services;
    }
}
