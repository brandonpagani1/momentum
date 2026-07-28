namespace Momentum.Api.Application.Analytics;

public sealed record DailyCountResponse(DateOnly Date, string Label, int Value);

public sealed record DailyAmountResponse(DateOnly Date, string Label, decimal Value);

public sealed record CategoryTotalResponse(string Category, decimal Total);

public sealed record HabitsAnalyticsResponse(
    int TotalActiveHabits,
    int CompletedToday,
    int TodayCompletionPercentage,
    int CompletionsThisWeek,
    IReadOnlyList<DailyCountResponse> DailyCompletions);

public sealed record TasksAnalyticsResponse(
    int TotalTasks,
    int CompletedTasks,
    int RemainingTasks,
    int CompletionPercentage,
    int? CompletedThisWeek,
    bool IsWeeklyActivityAvailable,
    IReadOnlyList<DailyCountResponse> DailyCompletions);

public sealed record FitnessAnalyticsResponse(
    int WorkoutsThisWeek,
    int MinutesThisWeek,
    int CaloriesThisWeek,
    IReadOnlyList<DailyCountResponse> DailyMinutes,
    int WorkoutsThisMonth);

public sealed record FinanceAnalyticsResponse(
    decimal IncomeThisMonth,
    decimal ExpensesThisMonth,
    decimal MonthlyBalance,
    IReadOnlyList<CategoryTotalResponse> ExpensesByCategory,
    IReadOnlyList<DailyAmountResponse> DailyExpenses);

public sealed record ScoreComponentResponse(int? Score, int Weight, bool HasData);

public sealed record MomentumScoreResponse(
    int? Score,
    ScoreComponentResponse Habits,
    ScoreComponentResponse Tasks,
    ScoreComponentResponse Fitness,
    ScoreComponentResponse Finance);

public sealed record AnalyticsPeriodResponse(
    DateOnly Today,
    DateOnly WeekStart,
    DateOnly WeekEnd,
    DateOnly MonthStart,
    DateOnly MonthEnd);

public sealed record AnalyticsSummaryResponse(
    AnalyticsPeriodResponse Period,
    HabitsAnalyticsResponse Habits,
    TasksAnalyticsResponse Tasks,
    FitnessAnalyticsResponse Fitness,
    FinanceAnalyticsResponse Finance,
    MomentumScoreResponse MomentumScore,
    bool HasAnyData);
