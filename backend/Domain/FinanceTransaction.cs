using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Domain;

public enum FinanceTransactionType
{
    Income,
    Expense
}

public sealed class FinanceTransaction
{
    public Guid Id { get; set; }

    public FinanceTransactionType Type { get; set; }

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public DateOnly TransactionDate { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public string UserId { get; set; } = string.Empty;

    public ApplicationUser User { get; set; } = null!;
}
