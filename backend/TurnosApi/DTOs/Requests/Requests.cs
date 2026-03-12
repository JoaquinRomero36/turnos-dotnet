// ─────────────────────────────────────────────────────────────
// REQUESTS
// ─────────────────────────────────────────────────────────────
namespace TurnosApi.DTOs.Requests;

using System.ComponentModel.DataAnnotations;

public record LoginRequest(
    [Required(ErrorMessage = "Username requerido")] string Username,
    [Required(ErrorMessage = "Password requerido")]  string Password
);

public record PacienteRequest(
    [Required] string Nombre,
    [Required] string Apellido,
    [Required] string Dni,
    [Required] string Telefono
);

public record CrearTurnoRequest(
    [Required] long            ProfesionalId,
    [Required] long            CategoriaId,
    [Required] DateTime        FechaHora,
    [Required] PacienteRequest Paciente,
               string?         DescripcionProblema
);

public record CrearProfesionalRequest(
    [Required] string Nombre,
    [Required] string Apellido,
    [Required] string Matricula,
    [Required] long   CategoriaId,
    [Required] string Username,
               string? Password
);
