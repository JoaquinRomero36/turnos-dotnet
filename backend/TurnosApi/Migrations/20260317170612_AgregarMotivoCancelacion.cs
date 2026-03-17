using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TurnosApi.Migrations
{
    /// <inheritdoc />
    public partial class AgregarMotivoCancelacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "motivo_cancelacion",
                table: "turnos",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "motivo_cancelacion",
                table: "turnos");
        }
    }
}
