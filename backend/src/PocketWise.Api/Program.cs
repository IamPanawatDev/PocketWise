using PocketWise.Api.BackgroundServices;
using PocketWise.Api.Configuration;
using PocketWise.Api.Hubs;
using PocketWise.Api.Middleware;
using PocketWise.Infrastructure.Configuration;
using PocketWise.Infrastructure.Persistence;
using NSwag.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Support dynamic port binding (e.g. Render passes PORT environment variable)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://*:{port}");
}

// Support local override configurations (git-ignored, e.g. appsettings.Development.Local.json)
builder.Configuration
    .AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.Local.json", optional: true, reloadOnChange: true);

// Configure logging (prevent Windows EventLog disposal/permission crashes on development)
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Add services to the container.

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPocketWiseAuthentication(builder.Configuration);
builder.Services.AddApplicationServices();
builder.Services.AddSignalR();

builder.Services.AddControllers()
    .AddJsonOptions(ControllerJsonOptionsConfiguration.Configure);

builder.Services.Configure<RecurringJobOptions>(
    builder.Configuration.GetSection("RecurringJob"));
builder.Services.AddHostedService<RecurringTransactionBackgroundService>();

builder.Services.Configure<MaintenanceJobOptions>(
    builder.Configuration.GetSection("MaintenanceJobs"));
builder.Services.AddHostedService<AuditLogCleanupBackgroundService>();
builder.Services.AddHostedService<RefreshTokenCleanupBackgroundService>();

const string CorsPolicyName = "PocketWiseWeb";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin)) return false;
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return uri.Host == "localhost" ||
                           uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase) ||
                           (builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
                               .Any(o => string.Equals(o, origin, StringComparison.OrdinalIgnoreCase));
                }
                return false;
            })
            .AllowCredentials()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                               Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();

// Seed initial data (System categories, permissions, roles)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PocketWiseDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DatabaseSeeder.SeedAsync(db, logger);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger", true))
{
    app.MapOpenApi();
    app.UseSwaggerUi(settings =>
    {
        settings.Path = "/swagger";
        settings.SwaggerRoutes.Add(new SwaggerUiRoute("PocketWise API", "/openapi/v1.json"));
    });
}

// Health check endpoints for hosting platforms (Render, etc.)
app.MapGet("/", () => Results.Ok(new { status = "healthy", service = "PocketWise API", timestamp = DateTime.UtcNow }));
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "PocketWise API", timestamp = DateTime.UtcNow }));

if (!app.Environment.IsDevelopment())
{
    // In production behind reverse proxy, ForwardedHeaders handles HTTPS scheme
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors(CorsPolicyName);

app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<MaintenanceModeMiddleware>();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
