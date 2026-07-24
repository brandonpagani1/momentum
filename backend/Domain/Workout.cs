using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Domain;

public sealed class Workout
{
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string WorkoutType { get; set; } = string.Empty;

    [Range(1, 1440)]
    public int DurationMinutes { get; set; }

    public DateOnly WorkoutDate { get; set; }

    [Range(0, int.MaxValue)]
    public int? CaloriesBurned { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
}
