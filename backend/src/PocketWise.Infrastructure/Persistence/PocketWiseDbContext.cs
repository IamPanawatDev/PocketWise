using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PocketWise.Domain.Entities;
using System.Reflection;

namespace PocketWise.Infrastructure.Persistence;

public class PocketWiseDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, long, IdentityUserClaim<long>, ApplicationUserRole, IdentityUserLogin<long>, IdentityRoleClaim<long>, IdentityUserToken<long>>
{
    public PocketWiseDbContext(DbContextOptions<PocketWiseDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserRefreshToken> UserRefreshTokens => Set<UserRefreshToken>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<ApplicationUserRole> ApplicationUserRoles => Set<ApplicationUserRole>();
    public DbSet<ApplicationRolePermission> ApplicationRolePermissions => Set<ApplicationRolePermission>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Merchant> Merchants => Set<Merchant>();
    public DbSet<CategoryRule> CategoryRules => Set<CategoryRule>();
    public DbSet<BankAccount> BankAccounts => Set<BankAccount>();
    public DbSet<CreditCard> CreditCards => Set<CreditCard>();

    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<TransactionTag> TransactionTags => Set<TransactionTag>();
    public DbSet<TransferGroup> TransferGroups => Set<TransferGroup>();
    public DbSet<RecurringTransaction> RecurringTransactions => Set<RecurringTransaction>();
    public DbSet<ImportJob> ImportJobs => Set<ImportJob>();
    public DbSet<SlipImportFile> SlipImportFiles => Set<SlipImportFile>();

    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Notification> Notifications => Set<Notification>();

    public DbSet<CreditCardStatement> CreditCardStatements => Set<CreditCardStatement>();
    public DbSet<CreditCardStatementItem> CreditCardStatementItems => Set<CreditCardStatementItem>();
    public DbSet<InstallmentPlan> InstallmentPlans => Set<InstallmentPlan>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        modelBuilder.Entity<ApplicationUser>().ToTable("Users");
        modelBuilder.Entity<ApplicationRole>().ToTable("Roles");
        modelBuilder.Entity<ApplicationUserRole>().ToTable("UserRoles");
        modelBuilder.Entity<IdentityUserClaim<long>>().ToTable("UserClaims");
        modelBuilder.Entity<IdentityUserLogin<long>>().ToTable("UserLogins");
        modelBuilder.Entity<IdentityUserToken<long>>().ToTable("UserTokens");
        modelBuilder.Entity<IdentityRoleClaim<long>>().ToTable("RoleClaims");
    }
}
