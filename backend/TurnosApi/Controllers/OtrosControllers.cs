using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurnosApi.Data;
using TurnosApi.DTOs.Requests;
using TurnosApi.Services;

namespace TurnosApi.Controllers;

// ─────────────────────────────────────────────────────────────
// Profesionales
// ─────────────────────────────────────────────────────────────

[ApiController]
[Route("api/profesionales")]
[Authorize]
public class ProfesionalesController(IProfesionalService profesionalService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] long? categoriaId) =>
        Ok(await profesionalService.GetAllAsync(categoriaId));

    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id) =>
        Ok(await profesionalService.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = "Secretario")]
    public async Task<IActionResult> Crear([FromBody] CrearProfesionalRequest req)
    {
        var result = await profesionalService.CrearAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = "Secretario")]
    public async Task<IActionResult> Actualizar(long id, [FromBody] CrearProfesionalRequest req) =>
        Ok(await profesionalService.ActualizarAsync(id, req));

    [HttpDelete("{id:long}")]
    [Authorize(Roles = "Secretario")]
    public async Task<IActionResult> Desactivar(long id)
    {
        await profesionalService.DesactivarAsync(id);
        return NoContent();
    }
}

// ─────────────────────────────────────────────────────────────
// Categorías
// ─────────────────────────────────────────────────────────────

[ApiController]
[Route("api/categorias")]
[Authorize]
public class CategoriasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAll() =>
        Ok(db.Categorias
             .Where(c => c.Activo)
             .OrderBy(c => c.Nombre)
             .Select(c => new { c.Id, c.Nombre, c.Descripcion })
             .ToList());
}

// ─────────────────────────────────────────────────────────────
// Estadísticas
// ─────────────────────────────────────────────────────────────

[ApiController]
[Route("api/estadisticas")]
[Authorize(Roles = "Secretario")]
public class EstadisticasController(IEstadisticaService estadisticaService) : ControllerBase
{
    [HttpGet("resumen")]
    public async Task<IActionResult> GetResumen(
        [FromQuery] DateOnly? desde,
        [FromQuery] DateOnly? hasta) =>
        Ok(await estadisticaService.GetResumenAsync(desde, hasta));
}
