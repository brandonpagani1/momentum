using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Domain;

namespace Momentum.Api.Infrastructure;

public sealed class AuthDbContext(DbContextOptions<AuthDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitCompletion> HabitCompletions => Set<HabitCompletion>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<Workout> Workouts => Set<Workout>();
    public DbSet<FinanceTransaction> FinanceTransactions => Set<FinanceTransaction>();
    public DbSet<Goal> Goals => Set<Goal>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Habit>(habit =>
        {
            habit.Property(item => item.Name).HasMaxLength(100).IsRequired();
            habit.Property(item => item.Description).HasMaxLength(300);
            habit.HasOne(item => item.User)
                .WithMany(user => user.Habits)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            habit.HasIndex(item => item.UserId);
        });

        builder.Entity<HabitCompletion>(completion =>
        {
            completion.HasOne(item => item.Habit)
                .WithMany(habit => habit.Completions)
                .HasForeignKey(item => item.HabitId)
                .OnDelete(DeleteBehavior.Cascade);
            completion.HasIndex(item => new { item.HabitId, item.CompletedOn }).IsUnique();
        });

        builder.Entity<TaskItem>(task =>
        {
            task.Property(item => item.Title).HasMaxLength(150).IsRequired();
            task.Property(item => item.Description).HasMaxLength(500);
            task.HasOne(item => item.User)
                .WithMany(user => user.Tasks)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            task.HasIndex(item => item.UserId);
            task.HasIndex(item => new { item.UserId, item.IsCompleted, item.DueDate });
        });

        builder.Entity<Workout>(workout =>
        {
            workout.Property(item => item.WorkoutType).HasMaxLength(100).IsRequired();
            workout.Property(item => item.Notes).HasMaxLength(500);
            workout.HasOne(item => item.User)
                .WithMany(user => user.Workouts)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            workout.HasIndex(item => item.UserId);
            workout.HasIndex(item => new { item.UserId, item.WorkoutDate });
        });

        builder.Entity<FinanceTransaction>(transaction =>
        {
            transaction.Property(item => item.Type).HasConversion<string>().HasMaxLength(10);
            transaction.Property(item => item.Amount).HasPrecision(18, 2);
            transaction.Property(item => item.Category).HasMaxLength(100).IsRequired();
            transaction.Property(item => item.Notes).HasMaxLength(500);
            transaction.HasOne(item => item.User)
                .WithMany(user => user.FinanceTransactions)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            transaction.HasIndex(item => item.UserId);
            transaction.HasIndex(item => new { item.UserId, item.TransactionDate });
        });

        builder.Entity<Goal>(goal =>
        {
            goal.Property(item => item.Title).HasMaxLength(150).IsRequired();
            goal.Property(item => item.Description).HasMaxLength(1000);
            goal.Property(item => item.Category).HasMaxLength(50).IsRequired();
            goal.Property(item => item.Unit).HasMaxLength(30);
            goal.Property(item => item.TargetValue).HasPrecision(18, 2);
            goal.Property(item => item.CurrentValue).HasPrecision(18, 2);
            goal.Property(item => item.Status).HasConversion<string>().HasMaxLength(12);
            goal.HasOne(item => item.User)
                .WithMany(user => user.Goals)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            goal.HasIndex(item => item.UserId);
            goal.HasIndex(item => new { item.UserId, item.Status, item.TargetDate });
        });
    }
}
