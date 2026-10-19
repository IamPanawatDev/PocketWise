using Microsoft.AspNetCore.Mvc;
using PocketWise.Application.DTOs;
using PocketWise.Application.Features.Auth;
using System.Net;
using System.Text.Json;

namespace PocketWise.Api.Middleware;

public class GlobalExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlerMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public GlobalExceptionHandlerMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlerMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AuthException ex)
        {
            await HandleAuthExceptionAsync(context, ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred while processing request {TraceId}", context.TraceIdentifier);
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleAuthExceptionAsync(HttpContext context, AuthException exception)
    {
        var statusCode = exception.Code switch
        {
            "VALIDATION_ERROR" => (int)HttpStatusCode.UnprocessableEntity,
            "CONFLICT" => (int)HttpStatusCode.Conflict,
            _ => (int)HttpStatusCode.BadRequest
        };

        var response = ApiResponse<object?>.Fail(exception.Code, exception.Message);
        await WriteResponseAsync(context, statusCode, response);
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = (int)HttpStatusCode.InternalServerError;
        var message = _environment.IsDevelopment()
            ? exception.Message
            : "เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง";

        var response = ApiResponse<object?>.Fail("INTERNAL_ERROR", message, context.TraceIdentifier);
        await WriteResponseAsync(context, statusCode, response);
    }

    private static async Task WriteResponseAsync(HttpContext context, int statusCode, ApiResponse<object?> response)
    {
        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.StatusCode = statusCode;

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
