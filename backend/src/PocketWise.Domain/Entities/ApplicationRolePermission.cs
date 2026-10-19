namespace PocketWise.Domain.Entities;

public class ApplicationRolePermission
{
    public long RoleId { get; set; }
    public int PermissionId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationRole Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}
