using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PocketWise.Infrastructure.Persistence;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<PocketWiseDbContext>
{
    public PocketWiseDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PocketWiseDbContext>();

        optionsBuilder.UseSqlServer(
            "Server=localhost;Database=PocketWiseDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True",
            sqlOptions => sqlOptions.MigrationsAssembly(typeof(PocketWiseDbContext).Assembly.FullName));

        return new PocketWiseDbContext(optionsBuilder.Options);
    }
}
