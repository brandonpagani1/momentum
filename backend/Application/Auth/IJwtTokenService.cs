using Momentum.Api.Domain;

namespace Momentum.Api.Application.Auth;

public interface IJwtTokenService
{
    AuthResponse CreateToken(ApplicationUser user);
}
