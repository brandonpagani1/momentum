using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Application.Finance;
using Momentum.Api.Domain;
using Momentum.Api.Infrastructure;

namespace Momentum.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/financetransactions")]
public sealed class FinanceTransactionsController(AuthDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FinanceTransactionResponse>>> GetAll()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var transactions = await dbContext.FinanceTransactions
            .AsNoTracking()
            .Where(transaction => transaction.UserId == userId)
            .ToListAsync();

        var response = transactions
            .OrderByDescending(transaction => transaction.TransactionDate)
            .ThenByDescending(transaction => transaction.CreatedAt)
            .Select(ToResponse)
            .ToList();

        return Ok(response);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FinanceTransactionResponse>> GetById(Guid id)
    {
        var transaction = await FindOwnedTransaction(id, asNoTracking: true);
        return transaction is null ? NotFound() : Ok(ToResponse(transaction));
    }

    [HttpPost]
    public async Task<ActionResult<FinanceTransactionResponse>> Create(
        CreateFinanceTransactionRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        if (!ValidateRequest(request.Type, request.Amount, request.Category, request.TransactionDate))
        {
            return ValidationProblem(ModelState);
        }

        var transaction = new FinanceTransaction
        {
            Id = Guid.NewGuid(),
            Type = ParseType(request.Type),
            Amount = request.Amount,
            Category = request.Category.Trim(),
            TransactionDate = request.TransactionDate,
            Notes = NormalizeNotes(request.Notes),
            CreatedAt = DateTimeOffset.UtcNow,
            UserId = userId
        };

        dbContext.FinanceTransactions.Add(transaction);
        await dbContext.SaveChangesAsync();

        return Created(
            $"/api/financetransactions/{transaction.Id}",
            ToResponse(transaction));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FinanceTransactionResponse>> Update(
        Guid id, UpdateFinanceTransactionRequest request)
    {
        if (!ValidateRequest(request.Type, request.Amount, request.Category, request.TransactionDate))
        {
            return ValidationProblem(ModelState);
        }

        var transaction = await FindOwnedTransaction(id);
        if (transaction is null) return NotFound();

        transaction.Type = ParseType(request.Type);
        transaction.Amount = request.Amount;
        transaction.Category = request.Category.Trim();
        transaction.TransactionDate = request.TransactionDate;
        transaction.Notes = NormalizeNotes(request.Notes);
        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(transaction));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var transaction = await FindOwnedTransaction(id);
        if (transaction is null) return NotFound();

        dbContext.FinanceTransactions.Remove(transaction);
        await dbContext.SaveChangesAsync();
        return NoContent();
    }

    private string? GetUserId() => User.FindFirstValue("sub");

    private async Task<FinanceTransaction?> FindOwnedTransaction(
        Guid id, bool asNoTracking = false)
    {
        var userId = GetUserId();
        if (userId is null) return null;

        IQueryable<FinanceTransaction> query = dbContext.FinanceTransactions;
        if (asNoTracking) query = query.AsNoTracking();

        return await query.SingleOrDefaultAsync(
            transaction => transaction.Id == id && transaction.UserId == userId);
    }

    private bool ValidateRequest(
        string? type, decimal amount, string? category, DateOnly transactionDate)
    {
        if (!Enum.TryParse<FinanceTransactionType>(type, ignoreCase: true, out _))
        {
            ModelState.AddModelError("Type", "Type must be Income or Expense.");
        }

        if (amount <= 0)
        {
            ModelState.AddModelError("Amount", "Amount must be greater than zero.");
        }

        if (string.IsNullOrWhiteSpace(category))
        {
            ModelState.AddModelError("Category", "Category is required.");
        }

        if (transactionDate == default)
        {
            ModelState.AddModelError("TransactionDate", "Transaction date is required.");
        }

        return ModelState.IsValid;
    }

    private static FinanceTransactionType ParseType(string type) =>
        Enum.Parse<FinanceTransactionType>(type, ignoreCase: true);

    private static FinanceTransactionResponse ToResponse(FinanceTransaction transaction) => new(
        transaction.Id,
        transaction.Type.ToString(),
        transaction.Amount,
        transaction.Category,
        transaction.TransactionDate,
        transaction.Notes,
        transaction.CreatedAt);

    private static string? NormalizeNotes(string? notes) =>
        string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
}
