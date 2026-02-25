using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LoveSpaBackend.Migrations
{
    /// <inheritdoc />
    public partial class AddInquiryWorkflowAndReply : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminNotes",
                table: "Inquiries",
                type: "nvarchar(1200)",
                maxLength: 1200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastReplySubject",
                table: "Inquiries",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RespondedAtUtc",
                table: "Inquiries",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Inquiries",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.Sql("UPDATE [Inquiries] SET [Status] = 'Pending' WHERE [Status] IS NULL OR LTRIM(RTRIM([Status])) = '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AdminNotes",
                table: "Inquiries");

            migrationBuilder.DropColumn(
                name: "LastReplySubject",
                table: "Inquiries");

            migrationBuilder.DropColumn(
                name: "RespondedAtUtc",
                table: "Inquiries");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Inquiries");
        }
    }
}
