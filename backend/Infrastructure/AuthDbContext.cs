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
    }
}
