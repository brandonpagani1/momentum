namespace Momentum.Api.Domain;

public sealed class Habit
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public required string UserId { get; set; }
    public ApplicationUser User { get; set; } = null!;
    public ICollection<HabitCompletion> Completions { get; set; } = [];
}

public sealed class HabitCompletion
{
    public Guid Id { get; set; }
    public Guid HabitId { get; set; }
    public Habit Habit { get; set; } = null!;
    public DateOnly CompletedOn { get; set; }
}
