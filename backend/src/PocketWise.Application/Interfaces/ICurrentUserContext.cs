namespace PocketWise.Application.Interfaces;

public interface ICurrentUserContext
{
    long? UserId { get; }
    string? UserEmail { get; }
    bool IsAuthenticated { get; }
}
