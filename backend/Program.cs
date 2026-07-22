var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseHttpsRedirection();

app.MapGet("/", () => Results.Ok(new
{
    message = "Momentum API is running."
}));

app.Run();
