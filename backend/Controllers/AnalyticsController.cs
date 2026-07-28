using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Application.Analytics;
using Momentum.Api.Domain;
using Momentum.Api.Infrastructure;

namespace Momentum.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/analytics")]
public sealed class AnalyticsController(AuthDbContext dbContext) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<AnalyticsSummaryResponse>> GetSummary()
    {
        var userId = User.FindFirstValue("sub");
        if (userId is null) return Unauthorized();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var weekEnd = weekStart.AddDays(7);
        var monthStart = new DateOnly(today.Year, today.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        // Ownership and date filters are applied in SQLite before data is materialized.
        // Grouping is deliberately done in memory to avoid provider-specific DateOnly
        // and decimal aggregation limitations.
        var habits = await dbContext.Habits
            .AsNoTracking()
            .Where(habit => habit.UserId == userId)
            .Select(habit => new
            {
                habit.CreatedAt,
                Completions = habit.Completions
                    .Where(item => item.CompletedOn >= weekStart && item.CompletedOn < weekEnd)
                    .Select(item => item.CompletedOn)
                    .ToList()
            })
            .ToListAsync();

        var tasks = await dbContext.Tasks
            .AsNoTracking()
            .Where(task => task.UserId == userId)
            .Select(task => new { task.IsCompleted })
            .ToListAsync();

        var workouts = await dbContext.Workouts
            .AsNoTracking()
            .Where(workout => workout.UserId == userId
                && workout.WorkoutDate >= monthStart
                && workout.WorkoutDate < monthEnd)
            .Select(workout => new
            {
                workout.WorkoutDate,
                workout.DurationMinutes,
                workout.CaloriesBurned
            })
            .ToListAsync();

        var transactions = await dbContext.FinanceTransactions
            .AsNoTracking()
            .Where(transaction => transaction.UserId == userId
                && transaction.TransactionDate >= monthStart
                && transaction.TransactionDate < monthEnd)
            .Select(transaction => new
            {
                transaction.Type,
                transaction.Amount,
                transaction.Category,
                transaction.TransactionDate
            })
            .ToListAsync();

        var weekDates = Enumerable.Range(0, 7).Select(weekStart.AddDays).ToList();
        var habitDates = habits.SelectMany(habit => habit.Completions).ToList();
        var habitsToday = habitDates.Count(date => date == today);
        var habitResponse = new HabitsAnalyticsResponse(
            habits.Count,
            habitsToday,
            Percentage(habitsToday, habits.Count),
            habitDates.Count,
            weekDates.Select(date => Daily(date, habitDates.Count(item => item == date))).ToList());

        var completedTasks = tasks.Count(task => task.IsCompleted);
        var taskResponse = new TasksAnalyticsResponse(
            tasks.Count,
            completedTasks,
            tasks.Count - completedTasks,
            Percentage(completedTasks, tasks.Count),
            null,
            false,
            []);

        var weeklyWorkouts = workouts
            .Where(workout => workout.WorkoutDate >= weekStart && workout.WorkoutDate < weekEnd)
            .ToList();
        var fitnessResponse = new FitnessAnalyticsResponse(
            weeklyWorkouts.Count,
            weeklyWorkouts.Sum(workout => workout.DurationMinutes),
            weeklyWorkouts.Sum(workout => workout.CaloriesBurned ?? 0),
            weekDates.Select(date => Daily(
                date,
                weeklyWorkouts.Where(workout => workout.WorkoutDate == date)
                    .Sum(workout => workout.DurationMinutes))).ToList(),
            workouts.Count);

        var income = transactions
            .Where(transaction => transaction.Type == FinanceTransactionType.Income)
            .Sum(transaction => transaction.Amount);
        var expenses = transactions
            .Where(transaction => transaction.Type == FinanceTransactionType.Expense)
            .Sum(transaction => transaction.Amount);
        var expenseTransactions = transactions
            .Where(transaction => transaction.Type == FinanceTransactionType.Expense)
            .ToList();
        var financeResponse = new FinanceAnalyticsResponse(
            income,
            expenses,
            income - expenses,
            expenseTransactions
                .GroupBy(transaction => transaction.Category.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(group => new CategoryTotalResponse(group.Key, group.Sum(item => item.Amount)))
                .OrderByDescending(item => item.Total)
                .ThenBy(item => item.Category)
                .ToList(),
            Enumerable.Range(0, monthEnd.DayNumber - monthStart.DayNumber)
                .Select(monthStart.AddDays)
                .Select(date => DailyAmount(
                    date,
                    expenseTransactions.Where(item => item.TransactionDate == date)
                        .Sum(item => item.Amount)))
                .ToList());

        int? habitScore = habits.Count == 0
            ? null
            : Percentage(
                habitDates.Count(date => date <= today),
                habits.Sum(habit =>
                {
                    var createdOn = DateOnly.FromDateTime(habit.CreatedAt.UtcDateTime);
                    var firstEligibleDay = createdOn > weekStart ? createdOn : weekStart;
                    return firstEligibleDay > today ? 0 : today.DayNumber - firstEligibleDay.DayNumber + 1;
                }));
        int? taskScore = tasks.Count == 0 ? null : taskResponse.CompletionPercentage;
        // 150 weekly minutes follows the widely used baseline activity target.
        int? fitnessScore = workouts.Count == 0
            ? null
            : Math.Min(100, (int)Math.Round(fitnessResponse.MinutesThisWeek / 150d * 100));
        int? financeScore = transactions.Count == 0
            ? null
            : income == 0
                ? (expenses == 0 ? 50 : 0)
                : ClampPercentage((income - expenses) / income * 100);

        // Components use 30/30/20/20 weights. Missing components are excluded and
        // remaining weights are normalized, so absent data grants neither 0 nor 100.
        var weightedScores = new (int? Score, int Weight)[]
        {
            (habitScore, 30), (taskScore, 30), (fitnessScore, 20), (financeScore, 20)
        };
        var availableWeight = weightedScores.Where(item => item.Score.HasValue).Sum(item => item.Weight);
        int? momentumScore = availableWeight == 0
            ? null
            : (int)Math.Round(weightedScores
                .Where(item => item.Score.HasValue)
                .Sum(item => item.Score!.Value * item.Weight) / (double)availableWeight);

        return Ok(new AnalyticsSummaryResponse(
            new AnalyticsPeriodResponse(today, weekStart, weekEnd.AddDays(-1), monthStart, monthEnd.AddDays(-1)),
            habitResponse,
            taskResponse,
            fitnessResponse,
            financeResponse,
            new MomentumScoreResponse(
                momentumScore,
                Component(habitScore, 30),
                Component(taskScore, 30),
                Component(fitnessScore, 20),
                Component(financeScore, 20)),
            habits.Count + tasks.Count + workouts.Count + transactions.Count > 0));
    }

    private static DailyCountResponse Daily(DateOnly date, int value) =>
        new(date, date.ToString("ddd"), value);

    private static DailyAmountResponse DailyAmount(DateOnly date, decimal value) =>
        new(date, date.ToString("ddd"), value);

    private static int Percentage(int value, int total) =>
        total <= 0 ? 0 : Math.Clamp((int)Math.Round(value / (double)total * 100), 0, 100);

    private static int ClampPercentage(decimal value) =>
        Math.Clamp((int)Math.Round(value), 0, 100);

    private static ScoreComponentResponse Component(int? score, int weight) =>
        new(score, weight, score.HasValue);
}
