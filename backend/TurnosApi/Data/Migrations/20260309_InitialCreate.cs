using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace TurnosApi.Data.Migrations;

/// <inheritdoc />
public partial class InitialCreate : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "categorias",
            columns: table => new
            {
                id          = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                nombre      = table.Column<string>(maxLength: 100, nullable: false),
                descripcion = table.Column<string>(nullable: true),
                activo      = table.Column<bool>(nullable: false)
            },
            constraints: table => table.PrimaryKey("pk_categorias", x => x.id));

        migrationBuilder.CreateIndex("ix_categorias_nombre", "categorias", "nombre", unique: true);

        migrationBuilder.CreateTable(
            name: "pacientes",
            columns: table => new
            {
                id         = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                nombre     = table.Column<string>(maxLength: 100, nullable: false),
                apellido   = table.Column<string>(maxLength: 100, nullable: false),
                dni        = table.Column<string>(maxLength: 20,  nullable: false),
                telefono   = table.Column<string>(maxLength: 30,  nullable: false),
                created_at = table.Column<DateTime>(nullable: false)
            },
            constraints: table => table.PrimaryKey("pk_pacientes", x => x.id));

        migrationBuilder.CreateIndex("ix_pacientes_dni", "pacientes", "dni", unique: true);

        migrationBuilder.CreateTable(
            name: "usuarios",
            columns: table => new
            {
                id            = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                username      = table.Column<string>(maxLength: 50,  nullable: false),
                password_hash = table.Column<string>(maxLength: 255, nullable: false),
                nombre        = table.Column<string>(maxLength: 100, nullable: false),
                apellido      = table.Column<string>(maxLength: 100, nullable: false),
                rol           = table.Column<string>(maxLength: 20,  nullable: false),
                activo        = table.Column<bool>(nullable: false),
                created_at    = table.Column<DateTime>(nullable: false)
            },
            constraints: table => table.PrimaryKey("pk_usuarios", x => x.id));

        migrationBuilder.CreateIndex("ix_usuarios_username", "usuarios", "username", unique: true);

        migrationBuilder.CreateTable(
            name: "profesionales",
            columns: table => new
            {
                id           = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                usuario_id   = table.Column<long>(nullable: false),
                categoria_id = table.Column<long>(nullable: false),
                nombre       = table.Column<string>(maxLength: 100, nullable: false),
                apellido     = table.Column<string>(maxLength: 100, nullable: false),
                matricula    = table.Column<string>(maxLength: 50,  nullable: false),
                activo       = table.Column<bool>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_profesionales", x => x.id);
                table.ForeignKey("fk_profesionales_categorias", x => x.categoria_id, "categorias", "id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey("fk_profesionales_usuarios", x => x.usuario_id, "usuarios", "id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex("ix_profesionales_matricula",  "profesionales", "matricula",  unique: true);
        migrationBuilder.CreateIndex("ix_profesionales_usuario_id", "profesionales", "usuario_id", unique: true);

        migrationBuilder.CreateTable(
            name: "turnos",
            columns: table => new
            {
                id                   = table.Column<long>(nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                paciente_id          = table.Column<long>(nullable: false),
                profesional_id       = table.Column<long>(nullable: false),
                categoria_id         = table.Column<long>(nullable: false),
                fecha_hora           = table.Column<DateTime>(nullable: false),
                descripcion_problema = table.Column<string>(nullable: true),
                estado               = table.Column<string>(maxLength: 20, nullable: false),
                creado_por_id        = table.Column<long>(nullable: true),
                cancelado_por_id     = table.Column<long>(nullable: true),
                cancelado_at         = table.Column<DateTime>(nullable: true),
                created_at           = table.Column<DateTime>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("pk_turnos", x => x.id);
                table.ForeignKey("fk_turnos_pacientes",       x => x.paciente_id,      "pacientes",     "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("fk_turnos_profesionales",   x => x.profesional_id,   "profesionales", "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("fk_turnos_categorias",      x => x.categoria_id,     "categorias",    "id", onDelete: ReferentialAction.Restrict);
                table.ForeignKey("fk_turnos_creado_por",      x => x.creado_por_id,    "usuarios",      "id", onDelete: ReferentialAction.SetNull);
                table.ForeignKey("fk_turnos_cancelado_por",   x => x.cancelado_por_id, "usuarios",      "id", onDelete: ReferentialAction.SetNull);
            });

        migrationBuilder.CreateIndex(
            name: "uq_profesional_fecha_hora",
            table: "turnos",
            columns: new[] { "profesional_id", "fecha_hora" },
            unique: true);

        migrationBuilder.CreateIndex("ix_turnos_categoria_id",  "turnos", "categoria_id");
        migrationBuilder.CreateIndex("ix_turnos_fecha_hora",    "turnos", "fecha_hora");
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("turnos");
        migrationBuilder.DropTable("profesionales");
        migrationBuilder.DropTable("pacientes");
        migrationBuilder.DropTable("usuarios");
        migrationBuilder.DropTable("categorias");
    }
}
