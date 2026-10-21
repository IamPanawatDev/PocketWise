using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PocketWise.Infrastructure.Persistence;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<PocketWiseDbContext>
{
    public PocketWiseDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PocketWiseDbContext>();

        optionsBuilder.UseNpgsql(
            "Host=localhost;Port=5432;Database=pocketwise_db;Username=postgres;Password=postgres",
            npgsqlOptions => npgsqlOptions.MigrationsAssembly(typeof(PocketWiseDbContext).Assembly.FullName));

        return new PocketWiseDbContext(optionsBuilder.Options);
    }
}
