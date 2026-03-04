using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoveSpaBackend.Migrations
{
    public partial class AddAppointmentDeposits : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DepositAmount",
                table: "Appointments",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "DepositStatus",
                table: "Appointments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<DateTime>(
                name: "DepositSubmittedAtUtc",
                table: "Appointments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DepositVerifiedAtUtc",
                table: "Appointments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentReference",
                table: "Appointments",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DepositAmount",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "DepositStatus",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "DepositSubmittedAtUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "DepositVerifiedAtUtc",
                table: "Appointments");

            migrationBuilder.DropColumn(
                name: "PaymentReference",
                table: "Appointments");
        }
    }
}
