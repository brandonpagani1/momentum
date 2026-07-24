using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Application.Tasks;
using Momentum.Api.Domain;
using Momentum.Api.Infrastructure;

namespace Momentum.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/tasks")]
public sealed class TasksController(AuthDbContext dbContext) : ControllerBase
{
        
    [HttpGet]
public async Task<ActionResult<IReadOnlyList<TaskResponse>>> GetAll()
    {
        var userId = GetUserId();

        var tasks = await dbContext.Tasks
            .AsNoTracking()
            .Where(task => task.UserId == userId)
            .ToListAsync();

        var response = tasks
            .OrderBy(task => task.IsCompleted)
            .ThenBy(task => task.DueDate == null)
            .ThenBy(task => task.DueDate)
            .ThenByDescending(task => task.CreatedAt)
            .Select(ToResponse)
            .ToList();

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TaskResponse>> GetById(Guid id)
    {
        var task = await FindOwnedTask(id, asNoTracking: true);
        return task is null ? NotFound() : Ok(ToResponse(task));
    }

    [HttpPost]
    public async Task<ActionResult<TaskResponse>> Create(CreateTaskRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (!ValidateTitle(request.Title)) return ValidationProblem(ModelState);

        var task = new TaskItem
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = NormalizeDescription(request.Description),
            DueDate = request.DueDate,
            Priority = request.Priority,
            CreatedAt = DateTimeOffset.UtcNow,
            UserId = userId
        };

        dbContext.Tasks.Add(task);
        await dbContext.SaveChangesAsync();

        return Created($"/api/tasks/{task.Id}", ToResponse(task));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TaskResponse>> Update(Guid id, UpdateTaskRequest request)
    {
        if (!ValidateTitle(request.Title)) return ValidationProblem(ModelState);

        var task = await FindOwnedTask(id);
        if (task is null) return NotFound();

        task.Title = request.Title.Trim();
        task.Description = NormalizeDescription(request.Description);
        task.DueDate = request.DueDate;
        task.Priority = request.Priority;
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(task));
    }

    [HttpPut("{id:guid}/completion")]
    public async Task<ActionResult<TaskResponse>> SetCompletion(
        Guid id, SetTaskCompletionRequest request)
    {
        var task = await FindOwnedTask(id);
        if (task is null) return NotFound();

        task.IsCompleted = request.IsCompleted;
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(task));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var task = await FindOwnedTask(id);
        if (task is null) return NotFound();

        dbContext.Tasks.Remove(task);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private string? GetUserId() => User.FindFirstValue("sub");

    private async Task<TaskItem?> FindOwnedTask(Guid id, bool asNoTracking = false)
    {
        var userId = GetUserId();
        if (userId is null) return null;

        IQueryable<TaskItem> query = dbContext.Tasks;
        if (asNoTracking) query = query.AsNoTracking();
        return await query.SingleOrDefaultAsync(task => task.Id == id && task.UserId == userId);
    }

    private bool ValidateTitle(string? title)
    {
        if (!string.IsNullOrWhiteSpace(title)) return true;

        ModelState.AddModelError("Title", "Task title is required.");
        return false;
    }

    private static TaskResponse ToResponse(TaskItem task) => new(
        task.Id,
        task.Title,
        task.Description,
        task.DueDate,
        task.Priority,
        task.IsCompleted,
        task.CreatedAt);

    private static string? NormalizeDescription(string? description) =>
        string.IsNullOrWhiteSpace(description) ? null : description.Trim();
}
