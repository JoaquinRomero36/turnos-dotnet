namespace TurnosApi.Entities;

// ── Enums ─────────────────────────────────────────────────────

public enum Rol          { Operadora, Profesional, Secretario }
public enum EstadoTurno  { Activo, Cancelado }

// ── Categoria ─────────────────────────────────────────────────

public class Categoria
{
    public long    Id          { get; set; }
    public string  Nombre      { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool    Activo      { get; set; } = true;

    public ICollection<Profesional> Profesionales { get; set; } = [];
}

// ── Usuario ───────────────────────────────────────────────────

public class Usuario
{
    public long     Id           { get; set; }
    public string   Username     { get; set; } = string.Empty;
    public string   PasswordHash { get; set; } = string.Empty;
    public string   Nombre       { get; set; } = string.Empty;
    public string   Apellido     { get; set; } = string.Empty;
    public Rol      Rol          { get; set; }
    public bool     Activo       { get; set; } = true;
    public DateTime CreatedAt    { get; set; } = DateTime.UtcNow;

    public Profesional? Profesional { get; set; }
}

// ── Profesional ───────────────────────────────────────────────

public class Profesional
{
    public long   Id          { get; set; }
    public long   UsuarioId   { get; set; }
    public long   CategoriaId { get; set; }
    public string Nombre      { get; set; } = string.Empty;
    public string Apellido    { get; set; } = string.Empty;
    public string Matricula   { get; set; } = string.Empty;
    public bool   Activo      { get; set; } = true;

    public Usuario   Usuario   { get; set; } = null!;
    public Categoria Categoria { get; set; } = null!;
    public ICollection<Turno> Turnos { get; set; } = [];

    public string NombreCompleto => $"Dr/a. {Nombre} {Apellido}";
}

// ── Paciente ──────────────────────────────────────────────────

public class Paciente
{
    public long     Id        { get; set; }
    public string   Nombre    { get; set; } = string.Empty;
    public string   Apellido  { get; set; } = string.Empty;
    public string   Dni       { get; set; } = string.Empty;
    public string   Telefono  { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Turno> Turnos { get; set; } = [];
}

// ── Turno ─────────────────────────────────────────────────────

public class Turno
{
    public long        Id                  { get; set; }
    public long        PacienteId          { get; set; }
    public long        ProfesionalId       { get; set; }
    public long        CategoriaId         { get; set; }
    public DateTime    FechaHora           { get; set; }
    public string?     DescripcionProblema { get; set; }
    public string?     MotivoCancelacion   { get; set; } // Nuevo campo
    public EstadoTurno Estado              { get; set; } = EstadoTurno.Activo;
    public long?       CreadoPorId         { get; set; }
    public long?       CanceladoPorId      { get; set; }
    public DateTime?   CanceladoAt         { get; set; }
    public DateTime    CreatedAt           { get; set; } = DateTime.UtcNow;

    public Paciente    Paciente     { get; set; } = null!;
    public Profesional Profesional  { get; set; } = null!;
    public Categoria   Categoria    { get; set; } = null!;
    public Usuario?    CreadoPor    { get; set; }
    public Usuario?    CanceladoPor { get; set; }
}
