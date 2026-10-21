using Microsoft.AspNetCore.Identity;

namespace PocketWise.Domain.Entities;

public class ApplicationRole : IdentityRole<long>
{
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<ApplicationRolePermission> RolePermissions { get; set; } = [];
}
