using PocketWise.Api.Authentication;
using PocketWise.Application.Features.Auth;
using PocketWise.Application.Interfaces;
using PocketWise.Infrastructure.Repositories;

namespace PocketWise.Api.Configuration;

public static class ApplicationServiceConfiguration
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITokenService, JwtTokenService>();
        services.AddScoped<IUserRefreshTokenRepository, UserRefreshTokenRepository>();

        return services;
    }
}
