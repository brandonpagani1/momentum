using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Momentum.Api.Domain;

namespace Momentum.Api.Infrastructure;

public sealed class AuthDbContext(DbContextOptions<AuthDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    public DbSet<Habit> Habits => Set<Habit>();
    public DbSet<HabitCompletion> HabitCompletions => Set<HabitCompletion>();

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
    }
}
