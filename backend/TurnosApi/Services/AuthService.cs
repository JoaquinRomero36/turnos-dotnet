using Microsoft.EntityFrameworkCore;
using System.Net;
using TurnosApi.Data;
using TurnosApi.DTOs.Requests;
using TurnosApi.DTOs.Responses;
using TurnosApi.Entities;
using TurnosApi.Exceptions;
using TurnosApi.Security;

namespace TurnosApi.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<Usuario>       GetByUsernameAsync(string username);
}

public class AuthService(AppDbContext db, JwtService jwt) : IAuthService
{
    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var usuario = await db.Usuarios
            .Include(u => u.Profesional)
                .ThenInclude(p => p!.Categoria)
            .FirstOrDefaultAsync(u => u.Username == request.Username && u.Activo)
            ?? throw new AppException(
                "Credenciales incorrectas", "CREDENCIALES_INVALIDAS", HttpStatusCode.Unauthorized);

        if (!BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash))
            throw new AppException(
                "Credenciales incorrectas", "CREDENCIALES_INVALIDAS", HttpStatusCode.Unauthorized);

        var token = jwt.GenerateToken(usuario);

        var info = new UsuarioInfoDto(
            usuario.Id,
            usuario.Username,
            usuario.Nombre,
            usuario.Apellido,
            usuario.Rol.ToString(),
            usuario.Profesional?.Id,
            usuario.Profesional?.CategoriaId,
            usuario.Profesional?.Categoria.Nombre
        );

        return new LoginResponse(token, "Bearer", info);
    }

    public async Task<Usuario> GetByUsernameAsync(string username) =>
        await db.Usuarios.FirstOrDefaultAsync(u => u.Username == username)
        ?? throw new NotFoundException($"Usuario no encontrado: {username}");
}
