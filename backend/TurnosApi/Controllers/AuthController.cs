using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TurnosApi.DTOs.Requests;
using TurnosApi.Services;

namespace TurnosApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>Login — devuelve JWT</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req) =>
        Ok(await authService.LoginAsync(req));

    /// <summary>Perfil del usuario autenticado</summary>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var usuario = await authService.GetByUsernameAsync(User.Identity!.Name!);
        return Ok(new
        {
            usuario.Id,
            usuario.Username,
            usuario.Nombre,
            usuario.Apellido,
            Rol = usuario.Rol.ToString()
        });
    }
}
