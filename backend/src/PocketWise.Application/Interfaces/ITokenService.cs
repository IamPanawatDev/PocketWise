using PocketWise.Application.DTOs.Auth;
using PocketWise.Domain.Entities;

namespace PocketWise.Application.Interfaces;

public interface ITokenService
{
    AuthResponse GenerateTokenPair(ApplicationUser user, IEnumerable<string>? roles = null);
    string HashToken(string token);
    string GenerateRefreshToken();
}
