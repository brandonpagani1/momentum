using System.ComponentModel.DataAnnotations;
namespace Momentum.Api.Application.Goals;

public sealed record CreateGoalRequest(
    [param: Required, MaxLength(150)] string Title,
    [param: MaxLength(1000)] string? Description,
    [param: Required, MaxLength(50)] string Category,
    decimal TargetValue,
    decimal CurrentValue,
    [param: MaxLength(30)] string? Unit,
    DateOnly StartDate,
    DateOnly TargetDate,
    [param: Required] string Status);

public sealed record UpdateGoalRequest(
    [param: Required, MaxLength(150)] string Title,
    [param: MaxLength(1000)] string? Description,
    [param: Required, MaxLength(50)] string Category,
    decimal TargetValue,
    decimal CurrentValue,
    [param: MaxLength(30)] string? Unit,
    DateOnly StartDate,
    DateOnly TargetDate,
    [param: Required] string Status);

public sealed record UpdateGoalProgressRequest(decimal CurrentValue);

public sealed record GoalResponse(
    Guid Id,
    string Title,
    string? Description,
    string Category,
    decimal TargetValue,
    decimal CurrentValue,
    string? Unit,
    DateOnly StartDate,
    DateOnly TargetDate,
    string Status,
    DateTimeOffset CreatedAt);
