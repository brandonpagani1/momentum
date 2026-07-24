using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Application.Fitness;
using Momentum.Api.Domain;
using Momentum.Api.Infrastructure;

namespace Momentum.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/workouts")]
public sealed class WorkoutsController(AuthDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkoutResponse>>> GetAll()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var workouts = await dbContext.Workouts
            .AsNoTracking()
            .Where(workout => workout.UserId == userId)
            .ToListAsync();

        var response = workouts
            .OrderByDescending(workout => workout.WorkoutDate)
            .ThenByDescending(workout => workout.CreatedAt)
            .Select(ToResponse)
            .ToList();

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkoutResponse>> GetById(Guid id)
    {
        var workout = await FindOwnedWorkout(id, asNoTracking: true);
        return workout is null ? NotFound() : Ok(ToResponse(workout));
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutResponse>> Create(CreateWorkoutRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (!ValidateWorkoutType(request.WorkoutType)) return ValidationProblem(ModelState);
        if (!ValidateWorkoutDate(request.WorkoutDate)) return ValidationProblem(ModelState);

        var workout = new Workout
        {
            Id = Guid.NewGuid(),
            WorkoutType = request.WorkoutType.Trim(),
            DurationMinutes = request.DurationMinutes,
            WorkoutDate = request.WorkoutDate,
            CaloriesBurned = request.CaloriesBurned,
            Notes = NormalizeNotes(request.Notes),
            CreatedAt = DateTimeOffset.UtcNow,
            UserId = userId
        };

        dbContext.Workouts.Add(workout);
        await dbContext.SaveChangesAsync();

        return Created($"/api/workouts/{workout.Id}", ToResponse(workout));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkoutResponse>> Update(
        Guid id, UpdateWorkoutRequest request)
    {
        if (!ValidateWorkoutType(request.WorkoutType)) return ValidationProblem(ModelState);
        if (!ValidateWorkoutDate(request.WorkoutDate)) return ValidationProblem(ModelState);

        var workout = await FindOwnedWorkout(id);
        if (workout is null) return NotFound();

        workout.WorkoutType = request.WorkoutType.Trim();
        workout.DurationMinutes = request.DurationMinutes;
        workout.WorkoutDate = request.WorkoutDate;
        workout.CaloriesBurned = request.CaloriesBurned;
        workout.Notes = NormalizeNotes(request.Notes);
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(workout));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var workout = await FindOwnedWorkout(id);
        if (workout is null) return NotFound();

        dbContext.Workouts.Remove(workout);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private string? GetUserId() => User.FindFirstValue("sub");

    private async Task<Workout?> FindOwnedWorkout(Guid id, bool asNoTracking = false)
    {
        var userId = GetUserId();
        if (userId is null) return null;

        IQueryable<Workout> query = dbContext.Workouts;
        if (asNoTracking) query = query.AsNoTracking();

        return await query.SingleOrDefaultAsync(
            workout => workout.Id == id && workout.UserId == userId);
    }

    private bool ValidateWorkoutType(string? workoutType)
    {
        if (!string.IsNullOrWhiteSpace(workoutType)) return true;

        ModelState.AddModelError("WorkoutType", "Workout type is required.");
        return false;
    }

    private bool ValidateWorkoutDate(DateOnly workoutDate)
    {
        if (workoutDate != default) return true;

        ModelState.AddModelError("WorkoutDate", "Workout date is required.");
        return false;
    }

    private static WorkoutResponse ToResponse(Workout workout) => new(
        workout.Id,
        workout.WorkoutType,
        workout.DurationMinutes,
        workout.WorkoutDate,
        workout.CaloriesBurned,
        workout.Notes,
        workout.CreatedAt);

    private static string? NormalizeNotes(string? notes) =>
        string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
}
