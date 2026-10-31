namespace PocketWise.Application.DTOs.Admin;

public class AnnouncementResponse
{
    public long AnnouncementId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public bool IsActive { get; set; }
    public long CreatedByUserId { get; set; }
    public string? CreatedByDisplayName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<AnnouncementTargetResponse> Targets { get; set; } = [];
}

public class AnnouncementTargetResponse
{
    public long AnnouncementTargetId { get; set; }
    public string TargetType { get; set; } = "All"; // All, Role, User, UnverifiedEmail
    public long? RoleId { get; set; }
    public string? RoleName { get; set; }
    public long? UserId { get; set; }
    public string? UserEmail { get; set; }
}

public class CreateAnnouncementRequest
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
    public bool IsActive { get; set; } = true;
    public List<CreateAnnouncementTargetRequest> Targets { get; set; } = [];
}

public class CreateAnnouncementTargetRequest
{
    public string TargetType { get; set; } = "All"; // All, Role, User, UnverifiedEmail
    public long? RoleId { get; set; }
    public long? UserId { get; set; }
}

public class UpdateAnnouncementRequest : CreateAnnouncementRequest
{
}

public class UserAnnouncementResponse
{
    public long AnnouncementId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime StartsAt { get; set; }
    public DateTime EndsAt { get; set; }
}
