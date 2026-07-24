using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Application.Fitness;

public sealed record CreateWorkoutRequest(
    [param: Required, StringLength(100, MinimumLength = 1)] string WorkoutType,
    [param: Range(1, 1440)] int DurationMinutes,
    DateOnly WorkoutDate,
    [param: Range(0, int.MaxValue)] int? CaloriesBurned,
    [param: StringLength(500)] string? Notes);

public sealed record UpdateWorkoutRequest(
    [param: Required, StringLength(100, MinimumLength = 1)] string WorkoutType,
    [param: Range(1, 1440)] int DurationMinutes,
    DateOnly WorkoutDate,
    [param: Range(0, int.MaxValue)] int? CaloriesBurned,
    [param: StringLength(500)] string? Notes);

public sealed record WorkoutResponse(
    Guid Id,
    string WorkoutType,
    int DurationMinutes,
    DateOnly WorkoutDate,
    int? CaloriesBurned,
    string? Notes,
    DateTimeOffset CreatedAt);
