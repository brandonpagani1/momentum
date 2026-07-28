using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Application.Goals;
using Momentum.Api.Domain;
using Momentum.Api.Infrastructure;

namespace Momentum.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/goals")]
public sealed class GoalsController(AuthDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GoalResponse>>> GetAll()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var goals = await dbContext.Goals.AsNoTracking()
            .Where(goal => goal.UserId == userId)
            .ToListAsync();

        return Ok(goals
            .OrderBy(goal => goal.Status == GoalStatus.Active ? 0 : goal.Status == GoalStatus.Paused ? 1 : 2)
            .ThenBy(goal => goal.TargetDate)
            .ThenByDescending(goal => goal.CreatedAt)
            .Select(ToResponse)
            .ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GoalResponse>> GetById(Guid id)
    {
        var goal = await FindOwnedGoal(id, asNoTracking: true);
        return goal is null ? NotFound() : Ok(ToResponse(goal));
    }

    [HttpPost]
    public async Task<ActionResult<GoalResponse>> Create([FromBody] CreateGoalRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (!Validate(request.Title, request.Category, request.TargetValue, request.CurrentValue,
                request.StartDate, request.TargetDate, request.Status, out var requestedStatus))
            return ValidationProblem(ModelState);

        var status = NormalizeStatus(requestedStatus, request.CurrentValue, request.TargetValue);
        var goal = new Goal
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = Optional(request.Description),
            Category = request.Category.Trim(),
            TargetValue = request.TargetValue,
            CurrentValue = request.CurrentValue,
            Unit = Optional(request.Unit),
            StartDate = request.StartDate,
            TargetDate = request.TargetDate,
            Status = status,
            CreatedAt = DateTimeOffset.UtcNow,
            UserId = userId
        };
        dbContext.Goals.Add(goal);
        await dbContext.SaveChangesAsync();
        return Created($"/api/goals/{goal.Id}", ToResponse(goal));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<GoalResponse>> Update(Guid id, [FromBody] UpdateGoalRequest request)
    {
        if (!Validate(request.Title, request.Category, request.TargetValue, request.CurrentValue,
                request.StartDate, request.TargetDate, request.Status, out var requestedStatus))
            return ValidationProblem(ModelState);

        var goal = await FindOwnedGoal(id);
        if (goal is null) return NotFound();

        goal.Title = request.Title.Trim();
        goal.Description = Optional(request.Description);
        goal.Category = request.Category.Trim();
        goal.TargetValue = request.TargetValue;
        goal.CurrentValue = request.CurrentValue;
        goal.Unit = Optional(request.Unit);
        goal.StartDate = request.StartDate;
        goal.TargetDate = request.TargetDate;
        goal.Status = NormalizeStatus(requestedStatus, request.CurrentValue, request.TargetValue);
        await dbContext.SaveChangesAsync();
        return Ok(ToResponse(goal));
    }

    [HttpPut("{id:guid}/progress")]
    public async Task<ActionResult<GoalResponse>> UpdateProgress(
        Guid id, [FromBody] UpdateGoalProgressRequest request)
    {
        var goal = await FindOwnedGoal(id);
        if (goal is null) return NotFound();
        if (request.CurrentValue < 0 || request.CurrentValue > goal.TargetValue)
        {
            ModelState.AddModelError(nameof(request.CurrentValue),
                $"Current value must be between 0 and {goal.TargetValue}.");
            return ValidationProblem(ModelState);
        }

        goal.CurrentValue = request.CurrentValue;
        goal.Status = NormalizeStatus(goal.Status, goal.CurrentValue, goal.TargetValue);
        await dbContext.SaveChangesAsync();
        return Ok(ToResponse(goal));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var goal = await FindOwnedGoal(id);
        if (goal is null) return NotFound();
        dbContext.Goals.Remove(goal);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private string? GetUserId() => User.FindFirstValue("sub");

    private async Task<Goal?> FindOwnedGoal(Guid id, bool asNoTracking = false)
    {
        var userId = GetUserId();
        if (userId is null) return null;
        IQueryable<Goal> query = dbContext.Goals;
        if (asNoTracking) query = query.AsNoTracking();
        return await query.SingleOrDefaultAsync(goal => goal.Id == id && goal.UserId == userId);
    }

    private bool Validate(string? title, string? category, decimal targetValue, decimal currentValue,
        DateOnly startDate, DateOnly targetDate, string? status, out GoalStatus parsedStatus)
    {
        var hasValidStatus = Enum.TryParse(status, ignoreCase: true, out parsedStatus)
            && Enum.IsDefined(parsedStatus);
        if (string.IsNullOrWhiteSpace(title))
            ModelState.AddModelError(nameof(title), "Goal title is required.");
        if (string.IsNullOrWhiteSpace(category))
            ModelState.AddModelError(nameof(category), "Goal category is required.");
        if (targetValue <= 0)
            ModelState.AddModelError(nameof(targetValue), "Target value must be greater than 0.");
        if (currentValue < 0)
            ModelState.AddModelError(nameof(currentValue), "Current value cannot be negative.");
        if (currentValue > targetValue)
            ModelState.AddModelError(nameof(currentValue), "Current value cannot exceed target value.");
        if (startDate == default)
            ModelState.AddModelError(nameof(startDate), "Start date is required.");
        if (targetDate < startDate)
            ModelState.AddModelError(nameof(targetDate), "Target date cannot be earlier than start date.");
        if (!hasValidStatus)
            ModelState.AddModelError(nameof(status), "Status must be Active, Completed, or Paused.");
        return ModelState.IsValid;
    }

    private static GoalStatus NormalizeStatus(GoalStatus requested, decimal current, decimal target) =>
        current >= target ? GoalStatus.Completed
        : requested == GoalStatus.Paused ? GoalStatus.Paused
        : GoalStatus.Active;

    private static string? Optional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static GoalResponse ToResponse(Goal goal) => new(
        goal.Id, goal.Title, goal.Description, goal.Category, goal.TargetValue,
        goal.CurrentValue, goal.Unit, goal.StartDate, goal.TargetDate, goal.Status.ToString(), goal.CreatedAt);
}
