namespace PocketWise.Application.DTOs.Admin;

public class AdminUserListItemResponse
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsEmailVerified { get; set; }
    public bool IsActive { get; set; }
    public bool IsSuspended { get; set; }
    public DateTime? SuspendedAt { get; set; }
    public string? SuspensionReason { get; set; }
    public string? SuspendedByDisplayName { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Roles { get; set; } = [];
    public DateTime? LastLoginAt { get; set; }
}

public class AdminUserDetailResponse : AdminUserListItemResponse
{
    public DateOnly? BirthDate { get; set; }
    public int TotalTransactionsCount { get; set; }
    public int TotalBankAccountsCount { get; set; }
    public int TotalCreditCardsCount { get; set; }
    public int ActiveSessionsCount { get; set; }
    public List<SecurityEventResponse> RecentSecurityEvents { get; set; } = [];
}

public class AdminSuspendUserRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class AdminUserSessionResponse
{
    public long Id { get; set; }
    public string? DeviceName { get; set; }
    public string? IpAddress { get; set; }
    public DateTime LastUsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public bool IsCurrent { get; set; }
}
