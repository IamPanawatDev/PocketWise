namespace PocketWise.Application.DTOs.Auth;

public record ForgotPasswordRequest(
    string Email
);

public record ForgotPasswordResponse(
    bool Sent,
    int CooldownSeconds,
    string Message
);

public record ResetPasswordRequest(
    long UserId,
    string Token,
    string NewPassword,
    string ConfirmPassword
);

public record ResetPasswordResponse(
    bool Success,
    string Message
);
