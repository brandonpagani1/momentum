using Microsoft.EntityFrameworkCore;

namespace Momentum.Api.Infrastructure;

public static class IdentitySeeder
{
    public static async Task ApplyDatabaseMigrationsAsync(this WebApplication app)
    {
        await using var scope = app.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        await dbContext.Database.MigrateAsync();
    }
}
