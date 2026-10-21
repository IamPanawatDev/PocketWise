using Microsoft.AspNetCore.Identity;

namespace PocketWise.Domain.Entities;

public class ApplicationUserRole : IdentityUserRole<long>
{
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
