using System.ComponentModel.DataAnnotations;

namespace Momentum.Api.Application.Finance;

public sealed record CreateFinanceTransactionRequest(
    [param: Required] string Type,
    [param: Range(typeof(decimal), "0.01", "79228162514264337593543950335")] decimal Amount,
    [param: Required, StringLength(100, MinimumLength = 1)] string Category,
    DateOnly TransactionDate,
    [param: StringLength(500)] string? Notes);

public sealed record UpdateFinanceTransactionRequest(
    [param: Required] string Type,
    [param: Range(typeof(decimal), "0.01", "79228162514264337593543950335")] decimal Amount,
    [param: Required, StringLength(100, MinimumLength = 1)] string Category,
    DateOnly TransactionDate,
    [param: StringLength(500)] string? Notes);

public sealed record FinanceTransactionResponse(
    Guid Id,
    string Type,
    decimal Amount,
    string Category,
    DateOnly TransactionDate,
    string? Notes,
    DateTimeOffset CreatedAt);
