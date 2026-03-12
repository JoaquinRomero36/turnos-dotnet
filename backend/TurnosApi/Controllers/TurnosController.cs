using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurnosApi.DTOs.Requests;
using TurnosApi.Entities;
using TurnosApi.Services;

namespace TurnosApi.Controllers;

[ApiController]
[Route("api/turnos")]
[Authorize]
public class TurnosController(ITurnoService turnoService, IAuthService authService) : ControllerBase
{
    private Task<Usuario> UsuarioActualAsync() =>
        authService.GetByUsernameAsync(User.Identity!.Name!);

    /// <summary>Vista de calendario — filtrada por rol y/o categoría</summary>
    [HttpGet("calendario")]
    public async Task<IActionResult> GetCalendario(
        [FromQuery] DateOnly fechaInicio,
        [FromQuery] DateOnly fechaFin,
        [FromQuery] long?    categoriaId) =>
        Ok(await turnoService.GetCalendarioAsync(fechaInicio, fechaFin, categoriaId, await UsuarioActualAsync()));

    /// <summary>Slots disponibles para una fecha y categoría</summary>
    [HttpGet("disponibles")]
    public async Task<IActionResult> GetDisponibles(
        [FromQuery] DateOnly fecha,
        [FromQuery] long     categoriaId) =>
        Ok(await turnoService.GetDisponibilidadAsync(fecha, categoriaId));

    /// <summary>Detalle de un turno por ID</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetById(long id) =>
        Ok(await turnoService.GetByIdAsync(id));

    /// <summary>Crear un nuevo turno</summary>
    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearTurnoRequest req)
    {
        var turno = await turnoService.CrearAsync(req, await UsuarioActualAsync());
        return CreatedAtAction(nameof(GetById), new { id = turno.Id }, turno);
    }

    /// <summary>Cancelar un turno</summary>
    [HttpPatch("{id:long}/cancelar")]
    public async Task<IActionResult> Cancelar(long id) =>
        Ok(await turnoService.CancelarAsync(id, await UsuarioActualAsync()));
}
