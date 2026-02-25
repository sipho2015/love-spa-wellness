using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoveSpaBackend.Migrations
{
    /// <inheritdoc />
    public partial class LinkTherapistsToStaffUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Therapists",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Therapists_UserId",
                table: "Therapists",
                column: "UserId",
                unique: true,
                filter: "[UserId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Therapists_Users_UserId",
                table: "Therapists",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Therapists_Users_UserId",
                table: "Therapists");

            migrationBuilder.DropIndex(
                name: "IX_Therapists_UserId",
                table: "Therapists");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Therapists");
        }
    }
}
