using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Application.Habits;

public sealed record CreateHabitRequest(
    [param: Required, StringLength(100, MinimumLength = 1)] string Name,
    [param: StringLength(300)] string? Description);

public sealed record UpdateHabitRequest(
    [param: Required, StringLength(100, MinimumLength = 1)] string Name,
    [param: StringLength(300)] string? Description);

public sealed record SetTodayCompletionRequest(bool IsCompleted);

public sealed record HabitResponse(
    Guid Id,
    string Name,
    string? Description,
    bool IsCompletedToday,
    int CurrentStreak,
    DateTimeOffset CreatedAt);
