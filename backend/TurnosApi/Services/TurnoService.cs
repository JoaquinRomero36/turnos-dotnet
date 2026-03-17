using System.Globalization;
using Microsoft.EntityFrameworkCore;
using TurnosApi.Data;
using TurnosApi.DTOs.Requests;
using TurnosApi.DTOs.Responses;
using TurnosApi.Entities;
using TurnosApi.Exceptions;

namespace TurnosApi.Services;

public interface ITurnoService
{
    Task<List<TurnoResponse>> GetCalendarioAsync(DateOnly fechaInicio, DateOnly fechaFin, long? categoriaId, Usuario usuario);
    Task<TurnoResponse> GetByIdAsync(long id);
    Task<TurnoResponse> CrearAsync(CrearTurnoRequest req, Usuario usuario);
    Task<TurnoResponse> CancelarAsync(long id, Usuario usuario, string motivo);
    Task<DisponibilidadResponse> GetDisponibilidadAsync(DateOnly fecha, long categoriaId);
}

public class TurnoService(AppDbContext db) : ITurnoService
{
    private const int MaxCuposCategoria = 3;
    private static readonly int[] HorasPermitidas = [8, 9, 10, 11];

    // ── Calendario ────────────────────────────────────────
    public async Task<List<TurnoResponse>> GetCalendarioAsync(
        DateOnly fechaInicio, DateOnly fechaFin, long? categoriaId, Usuario usuario)
    {
        var desde = fechaInicio.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var hasta  = fechaFin  .ToDateTime(TimeOnly.MaxValue,  DateTimeKind.Utc);

        var query = db.Turnos
            .Include(t => t.Paciente)
            .Include(t => t.Profesional)
            .Include(t => t.Categoria)
            .Include(t => t.CreadoPor)
            .Include(t => t.CanceladoPor)
            .Where(t => t.Estado == EstadoTurno.Activo
                     && t.FechaHora >= desde
                     && t.FechaHora <= hasta);

        if (usuario.Rol == Rol.Profesional)
        {
            var prof = await db.Profesionales
                               .FirstOrDefaultAsync(p => p.UsuarioId == usuario.Id)
                           ?? throw new NotFoundException("Perfil de profesional no encontrado");
            query = query.Where(t => t.ProfesionalId == prof.Id);
        }
        else if (categoriaId.HasValue)
        {
            query = query.Where(t => t.CategoriaId == categoriaId.Value);
        }

        var turnos = await query.OrderBy(t => t.FechaHora).ToListAsync();
        return turnos.Select(TurnoResponse.From).ToList();
    }

    // ── Por ID ────────────────────────────────────────────
    public async Task<TurnoResponse> GetByIdAsync(long id)
    {
        var turno = await IncluirNavegaciones()
                        .FirstOrDefaultAsync(t => t.Id == id)
                    ?? throw new NotFoundException($"Turno {id} no encontrado");
        return TurnoResponse.From(turno);
    }

    // ── Crear ─────────────────────────────────────────────
    public async Task<TurnoResponse> CrearAsync(CrearTurnoRequest req, Usuario usuarioActual)
    {
        // Parse the fechaHora string to DateTime (expected format: yyyy-MM-ddTHH:mm:ss)
        // This represents the local time at the clinic.
        DateTime fechaHoraLocal;
        if (!DateTime.TryParseExact(req.FechaHora, "yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out fechaHoraLocal))
        {
            throw new BusinessException("Formato de fecha y hora inválido. Use yyyy-MM-ddTHH:mm:ss");
        }

        // 1. Validate the local time (day of week, minute/second, hour in 08-11)
        ValidarFechaHora(fechaHoraLocal);

        // 2. Obtener profesional activo
        var profesional = await db.Profesionales
                               .Include(p => p.Categoria)
                               .FirstOrDefaultAsync(p => p.Id == req.ProfesionalId && p.Activo)
                           ?? throw new NotFoundException($"Profesional {req.ProfesionalId} no encontrado");

        // 3. Coherencia categoría ↔ profesional
        if (profesional.CategoriaId != req.CategoriaId)
            throw new BusinessException("El profesional no pertenece a la categoría indicada");

        // 4. Cupo: máx 3 turnos activos por categoría/hora
        // We compare using the UTC time stored in the database.
        DateTime fechaHoraUtc = fechaHoraLocal.ToUniversalTime();
        var ocupados = await db.Turnos.CountAsync(t =>
            t.CategoriaId == req.CategoriaId &&
            t.FechaHora   == fechaHoraUtc &&
            t.Estado      == EstadoTurno.Activo);

        if (ocupados >= MaxCuposCategoria)
            throw new CupoCompletoException(
                $"Cupo completo para {profesional.Categoria.Nombre} " +
                $"el {fechaHoraLocal:dd/MM/yyyy} a las {fechaHoraLocal.Hour:00}:00 hs");

        // 5. Profesional libre en ese slot
        var profOcupado = await db.Turnos.AnyAsync(t =>
            t.ProfesionalId == req.ProfesionalId &&
            t.FechaHora     == fechaHoraUtc &&
            t.Estado        == EstadoTurno.Activo);

        if (profOcupado)
            throw new ProfesionalOcupadoException(
                $"{profesional.NombreCompleto} ya tiene un turno en ese horario");

        // 6. Buscar o crear paciente por DNI
        var paciente = await ObtenerOCrearPacienteAsync(req.Paciente);

        // 7. Persistir
        var turno = new Turno
        {
            PacienteId          = paciente.Id,
            ProfesionalId       = profesional.Id,
            CategoriaId         = profesional.CategoriaId,
            FechaHora           = fechaHoraUtc,
            DescripcionProblema = req.DescripcionProblema,
            CreadoPorId         = usuarioActual.Id
        };

        db.Turnos.Add(turno);
        await db.SaveChangesAsync();

        return await GetByIdAsync(turno.Id);
    }

    // ── Cancelar ──────────────────────────────────────────────
    public async Task<TurnoResponse> CancelarAsync(long id, Usuario usuarioActual, string motivo)
    {
        if (string.IsNullOrWhiteSpace(motivo))
            throw new BusinessException("El motivo de cancelación es obligatorio");

        var turno = await IncluirNavegaciones().FirstOrDefaultAsync(t => t.Id == id)
                    ?? throw new NotFoundException($"Turno {id} no encontrado");

        if (turno.Estado == EstadoTurno.Cancelado)
            throw new BusinessException("El turno ya está cancelado");

        if (usuarioActual.Rol == Rol.Profesional)
        {
            var prof = await db.Profesionales
                               .FirstOrDefaultAsync(p => p.UsuarioId == usuarioActual.Id)
                            ?? throw new NotFoundException("Perfil de profesional no encontrado");

            if (turno.ProfesionalId != prof.Id)
                throw new ForbiddenException("No puede cancelar turnos de otro profesional");
        }

        turno.Estado           = EstadoTurno.Cancelado;
        turno.CanceladoPorId   = usuarioActual.Id;
        turno.CanceladoAt      = DateTime.UtcNow;
        turno.MotivoCancelacion = motivo;

        await db.SaveChangesAsync();
        return TurnoResponse.From(turno);
    }

    // ── Disponibilidad ──────────────────────────────────────
    public async Task<DisponibilidadResponse> GetDisponibilidadAsync(DateOnly fecha, long categoriaId)
    {
        if (fecha.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            throw new HorarioInvalidoException("No hay turnos los fines de semana");

        var categoria = await db.Categorias.FindAsync(categoriaId)
                        ?? throw new NotFoundException($"Categoría {categoriaId} no encontrada");

        var profesionalesCategoria = await db.Profesionales
            .Where(p => p.CategoriaId == categoriaId && p.Activo)
            .ToListAsync();

        var slots = new List<SlotHorario>(HorasPermitidas.Length);

        foreach (var hora in HorasPermitidas)
        {
            // Treat fecha as local date and time
            var fechaHoraLocal = fecha.ToDateTime(new TimeOnly(hora, 0), DateTimeKind.Local);
            var fechaHoraUtc = fechaHoraLocal.ToUniversalTime();

            var profOcupadosIds = await db.Turnos
                .Where(t => t.CategoriaId == categoriaId
                         && t.FechaHora   == fechaHoraUtc
                         && t.Estado      == EstadoTurno.Activo)
                .Select(t => t.ProfesionalId)
                .ToListAsync();

            var libres = profesionalesCategoria
                .Where(p => !profOcupadosIds.Contains(p.Id))
                .Select(p => new ProfesionalLibreDto(p.Id, p.Nombre, p.Apellido, p.NombreCompleto, p.Matricula))
                .ToList();

            slots.Add(new SlotHorario(
                Hora:                $"{hora:00}:00",
                TurnosOcupados:      profOcupadosIds.Count,
                CuposDisponibles:    Math.Max(0, MaxCuposCategoria - profOcupadosIds.Count),
                ProfesionalesLibres: libres
            ));
        }

        return new DisponibilidadResponse(fecha, categoriaId, categoria.Nombre, slots);
    }

    // ── Helpers privados ──────────────────────────────────────
    private IQueryable<Turno> IncluirNavegaciones() =>
        db.Turnos
          .Include(t => t.Paciente)
          .Include(t => t.Profesional)
          .Include(t => t.Categoria)
          .Include(t => t.CreadoPor)
          .Include(t => t.CanceladoPor);

    private static void ValidarFechaHora(DateTime fechaHora)
    {
        if (fechaHora.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
            throw new HorarioInvalidoException("Solo se permiten turnos de lunes a viernes");

        if (fechaHora.Minute != 0 || fechaHora.Second != 0)
            throw new HorarioInvalidoException("Los turnos deben ser en punto (XX:00 hs)");

        if (!HorasPermitidas.Contains(fechaHora.Hour))
            throw new HorarioInvalidoException("Horario no permitido — turnos disponibles: 08, 09, 10, 11 hs");
    }

    private async Task<Paciente> ObtenerOCrearPacienteAsync(PacienteRequest req)
    {
        var existente = await db.Pacientes.FirstOrDefaultAsync(p => p.Dni == req.Dni);

        if (existente is not null)
        {
            if (existente.Telefono != req.Telefono)
            {
                existente.Telefono = req.Telefono;
                await db.SaveChangesAsync();
            }
            return existente;
        }

        var nuevo = new Paciente
        {
            Nombre   = req.Nombre,
            Apellido = req.Apellido,
            Dni      = req.Dni,
            Telefono = req.Telefono
        };
        db.Pacientes.Add(nuevo);
        await db.SaveChangesAsync();
        return nuevo;
    }
}