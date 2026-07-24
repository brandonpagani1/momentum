using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Application.Auth;

public sealed record RegisterRequest(
    [param: Required, StringLength(80, MinimumLength = 2)] string DisplayName,
    [param: Required, EmailAddress] string Email,
    [param: Required, MinLength(8)] string Password);

public sealed record LoginRequest(
    [param: Required, EmailAddress] string Email,
    [param: Required] string Password);

public sealed record UserResponse(string Id, string DisplayName, string Email);

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset ExpiresAt,
    UserResponse User);