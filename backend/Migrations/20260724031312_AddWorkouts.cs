using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Momentum.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Workouts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    WorkoutType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    DurationMinutes = table.Column<int>(type: "INTEGER", nullable: false),
                    WorkoutDate = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    CaloriesBurned = table.Column<int>(type: "INTEGER", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UserId = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workouts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Workouts_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Workouts_UserId",
                table: "Workouts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Workouts_UserId_WorkoutDate",
                table: "Workouts",
                columns: new[] { "UserId", "WorkoutDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Workouts");
        }
    }
}
