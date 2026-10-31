using System.Security.Claims;
using System.Text.Json;
using PocketWise.Application.DTOs;
using PocketWise.Application.Interfaces;

namespace PocketWise.Api.Middleware;

public class MaintenanceModeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<MaintenanceModeMiddleware> _logger;

    public MaintenanceModeMiddleware(RequestDelegate next, ILogger<MaintenanceModeMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IMaintenanceModeService maintenanceService)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Exempt endpoints
        if (IsExemptPath(path))
        {
            await _next(context);
            return;
        }

        if (!await maintenanceService.IsMaintenanceActiveAsync(context.RequestAborted))
        {
            await _next(context);
            return;
        }

        // Check user identity & permissions
        if (context.User.Identity?.IsAuthenticated == true)
        {
            if (context.User.IsInRole("Admin") || context.User.HasClaim("permission", "MAINTENANCE_MODE_MANAGE"))
            {
                await _next(context);
                return;
            }

            var userIdClaim = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (long.TryParse(userIdClaim, out var userId) &&
                await maintenanceService.IsUserAllowedAsync(userId, context.RequestAborted))
            {
                await _next(context);
                return;
            }
        }

        // Block request with 503 Service Unavailable
        var status = await maintenanceService.GetStatusAsync(context.RequestAborted);

        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.ContentType = "application/json; charset=utf-8";

        if (status.EndsAt.HasValue && status.EndsAt.Value > DateTime.UtcNow)
        {
            var seconds = Math.Max(1, (int)(status.EndsAt.Value - DateTime.UtcNow).TotalSeconds);
            context.Response.Headers["Retry-After"] = seconds.ToString();
        }

        var json = JsonSerializer.Serialize(new
        {
            success = false,
            statusCode = 503,
            errorCode = "MAINTENANCE_MODE",
            message = status.Message,
            traceId = context.TraceIdentifier,
            data = new
            {
                startsAt = status.StartsAt,
                endsAt = status.EndsAt
            }
        }, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }

    private static bool IsExemptPath(string path)
    {
        return path == "/" ||
               path == "/health" ||
               path.StartsWith("/swagger") ||
               path.StartsWith("/openapi") ||
               path.StartsWith("/hubs") ||
               path.StartsWith("/api/v1/auth/login") ||
               path.StartsWith("/api/v1/auth/refresh") ||
               path.StartsWith("/api/v1/admin/maintenance");
    }
}
