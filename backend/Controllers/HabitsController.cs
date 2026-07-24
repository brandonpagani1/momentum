using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Application.Habits;
using Momentum.Api.Domain;
using Momentum.Api.Infrastructure;

namespace Momentum.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/habits")]
public sealed class HabitsController(AuthDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<HabitResponse>>> GetAll()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var habits = await dbContext.Habits
            .AsNoTracking()
            .Where(habit => habit.UserId == userId)
            .Include(habit => habit.Completions)
            .ToListAsync();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var response = habits
            .OrderBy(habit => habit.CreatedAt)
            .Select(habit => ToResponse(habit, today))
            .ToList();

        return Ok(response);    }

    [HttpPost]
    public async Task<ActionResult<HabitResponse>> Create(CreateHabitRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            ModelState.AddModelError(nameof(request.Name), "Habit name is required.");
            return ValidationProblem(ModelState);
        }

        var habit = new Habit
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = NormalizeDescription(request.Description),
            CreatedAt = DateTimeOffset.UtcNow,
            UserId = userId
        };

        dbContext.Habits.Add(habit);
        await dbContext.SaveChangesAsync();

        return Created($"/api/habits/{habit.Id}", ToResponse(habit, DateOnly.FromDateTime(DateTime.UtcNow)));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<HabitResponse>> Update(Guid id, UpdateHabitRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            ModelState.AddModelError(nameof(request.Name), "Habit name is required.");
            return ValidationProblem(ModelState);
        }

        var habit = await FindOwnedHabit(id, includeCompletions: true);
        if (habit is null) return NotFound();

        habit.Name = request.Name.Trim();
        habit.Description = NormalizeDescription(request.Description);
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(habit, DateOnly.FromDateTime(DateTime.UtcNow)));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var habit = await FindOwnedHabit(id);
        if (habit is null) return NotFound();

        dbContext.Habits.Remove(habit);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/today")]
    public async Task<ActionResult<HabitResponse>> SetTodayCompletion(
        Guid id, SetTodayCompletionRequest request)
    {
        var habit = await FindOwnedHabit(id, includeCompletions: true);
        if (habit is null) return NotFound();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var completion = habit.Completions.SingleOrDefault(item => item.CompletedOn == today);

        if (request.IsCompleted && completion is null)
        {
            var newCompletion = new HabitCompletion
            {
                Id = Guid.NewGuid(),
                HabitId = habit.Id,
                CompletedOn = today
            };

            dbContext.HabitCompletions.Add(newCompletion);
            habit.Completions.Add(newCompletion);
        }
        else if (!request.IsCompleted && completion is not null)
        {
            dbContext.HabitCompletions.Remove(completion);
            habit.Completions.Remove(completion);
        }

        await dbContext.SaveChangesAsync();
        return Ok(ToResponse(habit, today));
    }

    private string? GetUserId() => User.FindFirstValue("sub");

    private async Task<Habit?> FindOwnedHabit(Guid id, bool includeCompletions = false)
    {
        var userId = GetUserId();
        if (userId is null) return null;

        IQueryable<Habit> query = dbContext.Habits;
        if (includeCompletions) query = query.Include(habit => habit.Completions);
        return await query.SingleOrDefaultAsync(habit => habit.Id == id && habit.UserId == userId);
    }

    private static HabitResponse ToResponse(Habit habit, DateOnly today)
    {
        var completionDates = habit.Completions.Select(item => item.CompletedOn).ToHashSet();
        var cursor = completionDates.Contains(today) ? today : today.AddDays(-1);
        var streak = 0;
        while (completionDates.Contains(cursor))
        {
            streak++;
            cursor = cursor.AddDays(-1);
        }

        return new HabitResponse(
            habit.Id,
            habit.Name,
            habit.Description,
            completionDates.Contains(today),
            streak,
            habit.CreatedAt);
    }

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();
}
