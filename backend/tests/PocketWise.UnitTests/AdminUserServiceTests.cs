using PocketWise.Domain.Rules;
using PocketWise.Infrastructure.Services.Admin;
using Xunit;

namespace PocketWise.UnitTests;

public class AdminUserServiceTests
{
    [Fact]
    public async Task SuspendUserAsync_WhenSuspendingSelf_ThrowsBusinessException()
    {
        var service = new AdminUserService(null!, null!, null!, null!, null!);

        var ex = await Assert.ThrowsAsync<BusinessException>(() =>
            service.SuspendUserAsync(userId: 1, adminUserId: 1, reason: "Self test"));

        Assert.Equal("OPERATION_NOT_ALLOWED", ex.Code);
        Assert.Contains("ไม่สามารถระงับบัญชีของตนเองได้", ex.Message);
    }
}
