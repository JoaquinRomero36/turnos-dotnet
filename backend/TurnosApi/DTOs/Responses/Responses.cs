// ─────────────────────────────────────────────────────────────
// RESPONSES
// ─────────────────────────────────────────────────────────────
namespace TurnosApi.DTOs.Responses;

using TurnosApi.Entities;

// ── Auth ──────────────────────────────────────────────────────

public record UsuarioInfoDto(
    long    Id,
    string  Username,
    string  Nombre,
    string  Apellido,
    string  Rol,
    long?   ProfesionalId,
    long?   CategoriaId,
    string? CategoriaNombre
);

public record LoginResponse(string Token, string Tipo, UsuarioInfoDto Usuario);

// ── Categoría ─────────────────────────────────────────────────

public record CategoriaDto(long Id, string Nombre, string? Descripcion);

// ── Profesional ───────────────────────────────────────────────

public record ProfesionalResponse(
    long         Id,
    string       Nombre,
    string       Apellido,
    string       NombreCompleto,
    string       Matricula,
    bool         Activo,
    long         UsuarioId,
    string       Username,
    CategoriaDto Categoria
)
{
    public static ProfesionalResponse From(Profesional p) => new(
        p.Id, p.Nombre, p.Apellido, p.NombreCompleto, p.Matricula, p.Activo,
        p.Usuario.Id, p.Usuario.Username,
        new CategoriaDto(p.Categoria.Id, p.Categoria.Nombre, p.Categoria.Descripcion)
    );
}

// ── Turno ─────────────────────────────────────────────────────

public record TurnoCategoriaDto  (long Id, string Nombre);
public record TurnoProfesionalDto(long Id, string Nombre, string Apellido, string NombreCompleto, string Matricula);
public record TurnoPacienteDto   (long Id, string Nombre, string Apellido, string NombreCompleto, string Dni, string Telefono);

public record TurnoResponse(
    long                Id,
    DateTime            FechaHora,
    string              Estado,
    string?             DescripcionProblema,
    DateTime            CreatedAt,
    DateTime?           CanceladoAt,
    TurnoCategoriaDto   Categoria,
    TurnoProfesionalDto Profesional,
    TurnoPacienteDto    Paciente,
    string?             CreadoPor,
    string?             CanceladoPor
)
{
    public static TurnoResponse From(Turno t) => new(
        t.Id, t.FechaHora, t.Estado.ToString(), t.DescripcionProblema, t.CreatedAt, t.CanceladoAt,
        new TurnoCategoriaDto(t.Categoria.Id, t.Categoria.Nombre),
        new TurnoProfesionalDto(t.Profesional.Id, t.Profesional.Nombre, t.Profesional.Apellido,
            t.Profesional.NombreCompleto, t.Profesional.Matricula),
        new TurnoPacienteDto(t.Paciente.Id, t.Paciente.Nombre, t.Paciente.Apellido,
            $"{t.Paciente.Nombre} {t.Paciente.Apellido}", t.Paciente.Dni, t.Paciente.Telefono),
        t.CreadoPor?.Username,
        t.CanceladoPor?.Username
    );
}

// ── Disponibilidad ────────────────────────────────────────────

public record ProfesionalLibreDto(long Id, string Nombre, string Apellido, string NombreCompleto, string Matricula);

public record SlotHorario(
    string                           Hora,
    int                              TurnosOcupados,
    int                              CuposDisponibles,
    IReadOnlyList<ProfesionalLibreDto> ProfesionalesLibres
);

public record DisponibilidadResponse(
    DateOnly                    Fecha,
    long                        CategoriaId,
    string                      CategoriaNombre,
    IReadOnlyList<SlotHorario>  Slots
);

// ── Estadísticas ──────────────────────────────────────────────

public record CategoriaStats(string Categoria, long Cantidad, double Porcentaje);
public record FranjaStats   (string Hora,       long Cantidad, double OcupacionPct);

public record EstadisticasResponse(
    long   TotalActivos,
    long   TotalCancelados,
    long   TotalGeneral,
    double TasaAsistencia,
    double TasaCancelacion,
    IReadOnlyList<CategoriaStats> PorCategoria,
    IReadOnlyList<FranjaStats>    PorFranja
);

// ── Error ─────────────────────────────────────────────────────

public record ErrorResponse(
    string                      Error,
    string                      Mensaje,
    Dictionary<string, string>? Detalles = null
)
{
    public DateTime Timestamp { get; } = DateTime.UtcNow;
}
