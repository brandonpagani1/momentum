using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Domain;

public class TaskItem
{
    public Guid Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool IsCompleted { get; set; }

    public DateOnly? DueDate { get; set; }

    public int Priority { get; set; } = 2;

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = default!;
}