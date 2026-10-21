namespace PocketWise.Application.DTOs.Auth;

public record SendVerificationEmailResponse(
    bool Sent,
    string Email,
    int CooldownSeconds,
    string? Message = null
);

public record VerifyEmailRequest(
    long UserId,
    string Token
);

public record VerifyEmailResponse(
    bool Verified,
    string Email,
    string? Message = null
);
