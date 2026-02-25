using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoveSpaBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddAppointmentCustomerOwnershipAndNotifications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Appointments_TherapistId",
                table: "Appointments");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAtUtc",
                table: "Appointments",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.AddColumn<string>(
                name: "CustomerEmail",
                table: "Appointments",
                type: "nvarchar(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CustomerUserId",
                table: "Appointments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAtUtc",
                table: "Appointments",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "SYSUTCDATETIME()");

            migrationBuilder.Sql("""
                                 UPDATE [Appointments]
                                 SET [CreatedAtUtc] = SYSUTCDATETIME(),
                                     [UpdatedAtUtc] = SYSUTCDATETIME()
                                 WHERE [CreatedAtUtc] = '0001-01-01T00:00:00.0000000'
                                    OR [UpdatedAtUtc] = '0001-01-01T00:00:00.0000000';
                                 """);

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_CustomerUserId",
                table: "Appointments",
                column: "CustomerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_TherapistId_AppointmentDate_TimeSlot_Status",
                table: "Appointments",
                columns: new[] { "TherapistId", "AppointmentDate", "TimeSlot", "Status" });

            migrationBuilder.AddForeignKey(
                name: "FK_Appointments_Users_CustomerUserId",
                table: "Appointments",
                column: "CustomerUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Appointments_Users_CustomerUserId",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_CustomerUserId",
                table: "Appointments");

            migrationBuilder.DropIndex(
                name: "IX_Appointments_TherapistId_AppointmentDate_TimeSlot_Status",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CreatedAtUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CustomerEmail",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "CustomerUserId",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "UpdatedAtUtc",
                table: "Appointments");

            migrationBuilder.CreateIndex(
                name: "IX_Appointments_TherapistId",
                table: "Appointments",
                column: "TherapistId");
        }
    }
}
