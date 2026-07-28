using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Domain;

public enum GoalStatus
{
    Active,
    Completed,
    Paused
}

public sealed class Goal
{
    public Guid Id { get; set; }

    [Required, MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required, MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    public decimal TargetValue { get; set; }
    public decimal CurrentValue { get; set; }

    [MaxLength(30)]
    public string? Unit { get; set; }

    public DateOnly StartDate { get; set; }
    public DateOnly TargetDate { get; set; }
    public GoalStatus Status { get; set; } = GoalStatus.Active;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string UserId { get; set; } = string.Empty;
    public ApplicationUser User { get; set; } = null!;
}
