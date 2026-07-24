using Microsoft.AspNetCore.Identity;

namespace Momentum.Api.Domain;

public sealed class ApplicationUser : IdentityUser
{
    public required string DisplayName { get; set; }

    public ICollection<Habit> Habits { get; set; } = [];
}
