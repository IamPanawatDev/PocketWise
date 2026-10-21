namespace PocketWise.Application.DTOs;

public class ApiResponse<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public ApiError? Error { get; init; }

    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };
    public static ApiResponse<T> Fail(string code, string message, string? traceId = null, IReadOnlyList<ValidationError>? details = null) =>
        new() { Success = false, Error = new ApiError(code, message, traceId, details) };
}

public class ApiError
{
    public ApiError(string code, string message, string? traceId, IReadOnlyList<ValidationError>? details)
    {
        Code = code;
        Message = message;
        TraceId = traceId;
        Details = details;
    }

    public string Code { get; }
    public string Message { get; }
    public string? TraceId { get; }
    public IReadOnlyList<ValidationError>? Details { get; }
}

public class ValidationError
{
    public ValidationError(string field, string message)
    {
        Field = field;
        Message = message;
    }

    public string Field { get; }
    public string Message { get; }
}
