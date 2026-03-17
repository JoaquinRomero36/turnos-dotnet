using Microsoft.EntityFrameworkCore;
using TurnosApi.Data;
using TurnosApi.DTOs.Responses;
using TurnosApi.Entities;

namespace TurnosApi.Services;

public interface IEstadisticaService
{
    Task<EstadisticasResponse> GetResumenAsync(DateOnly? desde, DateOnly? hasta);
}

public class EstadisticaService(AppDbContext db) : IEstadisticaService
{
    // Capacidad máxima por franja: 4 categorías × 3 cupos
    private const int CuposPorFranja = 12;

    public async Task<EstadisticasResponse> GetResumenAsync(DateOnly? desde, DateOnly? hasta)
    {
        var inicio = (desde ?? new DateOnly(DateTime.Today.Year, DateTime.Today.Month, 1))
            .ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var fin = (hasta ?? DateOnly.FromDateTime(DateTime.Today))
            .ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        // Totales en el período
        long totalActivos    = await db.Turnos.CountAsync(t => t.FechaHora >= inicio && t.FechaHora <= fin && t.Estado == EstadoTurno.Activo);
        long totalCancelados = await db.Turnos.CountAsync(t => t.FechaHora >= inicio && t.FechaHora <= fin && t.Estado == EstadoTurno.Cancelado);
        long totalGeneral    = totalActivos + totalCancelados;

        double tasaAsistencia  = totalGeneral > 0 ? Math.Round(totalActivos    * 100.0 / totalGeneral, 1) : 0;
        double tasaCancelacion = totalGeneral > 0 ? Math.Round(totalCancelados * 100.0 / totalGeneral, 1) : 0;

        // Por categoría en el período
        var porCatRaw = await db.Turnos
            .Where(t => t.FechaHora >= inicio && t.FechaHora <= fin)
            .GroupBy(t => t.Categoria.Nombre)
            .Select(g => new { Categoria = g.Key, Cantidad = (long)g.Count() })
            .OrderByDescending(x => x.Cantidad)
            .ToListAsync();

        long totalPeriodo = porCatRaw.Sum(x => x.Cantidad);

        var porCategoria = porCatRaw
            .Select(x => new CategoriaStats(
                x.Categoria,
                x.Cantidad,
                totalPeriodo > 0 ? Math.Round(x.Cantidad * 100.0 / totalPeriodo, 1) : 0
            ))
            .ToList();

        // Por franja horaria en el período (solo activos)
        var porFranjaRaw = await db.Turnos
            .Where(t => t.FechaHora >= inicio && t.FechaHora <= fin && t.Estado == EstadoTurno.Activo)
            .GroupBy(t => t.FechaHora.Hour)
            .Select(g => new { Hora = g.Key, Cantidad = (long)g.Count() })
            .OrderBy(x => x.Hora)
            .ToListAsync();

        var porFranja = porFranjaRaw
            .Select(x => new FranjaStats(
                $"{x.Hora:00}:00",
                x.Cantidad,
                Math.Round(x.Cantidad * 100.0 / CuposPorFranja, 1)
            ))
            .ToList();

        // Top 3 profesionales con más turnos cancelados
        var topCanceladosRaw = await db.Turnos
            .Where(t => t.FechaHora >= inicio && t.FechaHora <= fin && t.Estado == EstadoTurno.Cancelado)
            .GroupBy(t => new { t.Profesional.Id, t.Profesional.Nombre, t.Profesional.Apellido })
            .Select(g => new { 
                g.Key.Id, 
                NombreCompleto = "Dr/a. " + g.Key.Nombre + " " + g.Key.Apellido,
                Cantidad = (long)g.Count() 
            })
            .OrderByDescending(x => x.Cantidad)
            .Take(3)
            .ToListAsync();

        var topProfesionalesCancelados = topCanceladosRaw
            .Select(x => new ProfesionalStats(x.Id, x.NombreCompleto, x.Cantidad))
            .ToList();

        // Top 3 profesionales con menos turnos cancelados (menos es mejor)
        // Primero obtenemos todos los profesionales con sus conteos de cancelados
        var todosProfesionalesCancelados = await db.Turnos
            .Where(t => t.FechaHora >= inicio && t.FechaHora <= fin && t.Estado == EstadoTurno.Cancelado)
            .GroupBy(t => new { t.Profesional.Id, t.Profesional.Nombre, t.Profesional.Apellido })
            .Select(g => new { 
                g.Key.Id, 
                NombreCompleto = "Dr/a. " + g.Key.Nombre + " " + g.Key.Apellido,
                CantidadCancelados = (long)g.Count() 
            })
            .ToListAsync();

        // Obtenemos todos los profesionales (incluso los que no tienen cancelados)
        var todosProfesionales = await db.Profesionales
            .Where(p => p.Activo)
            .Select(p => new { 
                p.Id, 
                NombreCompleto = "Dr/a. " + p.Nombre + " " + p.Apellido 
            })
            .ToListAsync();

        // Combinamos: profesionales con 0 cancelados + profesionales con cancelados
        var profesionalesConCancelados = todosProfesionales
            .Select(p => new {
                p.Id,
                p.NombreCompleto,
                CantidadCancelados = todosProfesionalesCancelados
                    .Where(c => c.Id == p.Id)
                    .Select(c => c.CantidadCancelados)
                    .FirstOrDefault()
            })
            .OrderBy(x => x.CantidadCancelados) // Ordenar ascendente (menos cancelados primero)
            .Take(3)
            .ToList();

        var topProfesionalesActivos = profesionalesConCancelados
            .Select(x => new ProfesionalStats(x.Id, x.NombreCompleto, x.CantidadCancelados))
            .ToList();

        return new EstadisticasResponse(
            totalActivos, totalCancelados, totalGeneral,
            tasaAsistencia, tasaCancelacion,
            porCategoria, porFranja,
            topProfesionalesCancelados, topProfesionalesActivos
        );
    }
}
