using PocketWise.Api.BackgroundServices;
using PocketWise.Api.Configuration;
using PocketWise.Api.Hubs;
using PocketWise.Api.Middleware;
using PocketWise.Infrastructure.Configuration;
using PocketWise.Infrastructure.Persistence;
using NSwag.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

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

const string CorsPolicyName = "PocketWiseWeb";
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins("http://localhost:3000")
            .AllowCredentials()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Seed initial data (System categories, permissions, roles)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PocketWiseDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    await DatabaseSeeder.SeedAsync(db, logger);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUi(settings =>
    {
        settings.Path = "/swagger";
        settings.SwaggerRoutes.Add(new SwaggerUiRoute("PocketWise API", "/openapi/v1.json"));
    });
}

app.UseHttpsRedirection();

app.UseCors(CorsPolicyName);

app.UseMiddleware<GlobalExceptionHandlerMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");

app.Run();
