using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Application.Tasks;

public sealed record CreateTaskRequest(
    [param: Required, StringLength(150, MinimumLength = 1)] string Title,
    [param: StringLength(500)] string? Description,
    DateOnly? DueDate,
    [param: Range(1, 3)] int Priority);

public sealed record UpdateTaskRequest(
    [param: Required, StringLength(150, MinimumLength = 1)] string Title,
    [param: StringLength(500)] string? Description,
    DateOnly? DueDate,
    [param: Range(1, 3)] int Priority);

public sealed record SetTaskCompletionRequest(bool IsCompleted);

public sealed record TaskResponse(
    Guid Id,
    string Title,
    string? Description,
    DateOnly? DueDate,
    int Priority,
    bool IsCompleted,
    DateTimeOffset CreatedAt);
