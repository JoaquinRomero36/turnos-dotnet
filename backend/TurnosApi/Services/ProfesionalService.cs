using Microsoft.EntityFrameworkCore;
using TurnosApi.Data;
using TurnosApi.DTOs.Requests;
using TurnosApi.DTOs.Responses;
using TurnosApi.Entities;
using TurnosApi.Exceptions;

namespace TurnosApi.Services;

public interface IProfesionalService
{
    Task<List<ProfesionalResponse>> GetAllAsync(long? categoriaId);
    Task<ProfesionalResponse>       GetByIdAsync(long id);
    Task<ProfesionalResponse>       CrearAsync(CrearProfesionalRequest req);
    Task<ProfesionalResponse>       ActualizarAsync(long id, CrearProfesionalRequest req);
    Task                            DesactivarAsync(long id);
}

public class ProfesionalService(AppDbContext db) : IProfesionalService
{
    private IQueryable<Profesional> QueryBase() =>
        db.Profesionales
          .Include(p => p.Usuario)
          .Include(p => p.Categoria);

    public async Task<List<ProfesionalResponse>> GetAllAsync(long? categoriaId)
    {
        var q = QueryBase().Where(p => p.Activo);
        if (categoriaId.HasValue)
            q = q.Where(p => p.CategoriaId == categoriaId.Value);

        return await q
            .OrderBy(p => p.Categoria.Nombre).ThenBy(p => p.Apellido)
            .Select(p => ProfesionalResponse.From(p))
            .ToListAsync();
    }

    public async Task<ProfesionalResponse> GetByIdAsync(long id)
    {
        var p = await QueryBase().FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new NotFoundException($"Profesional {id} no encontrado");
        return ProfesionalResponse.From(p);
    }

    public async Task<ProfesionalResponse> CrearAsync(CrearProfesionalRequest req)
    {
        if (await db.Usuarios.AnyAsync(u => u.Username == req.Username))
            throw new BusinessException("El username ya está en uso");

        if (await db.Profesionales.AnyAsync(p => p.Matricula == req.Matricula))
            throw new BusinessException("La matrícula ya está registrada");

        if (!await db.Categorias.AnyAsync(c => c.Id == req.CategoriaId && c.Activo))
            throw new NotFoundException($"Categoría {req.CategoriaId} no encontrada");

        if (string.IsNullOrWhiteSpace(req.Password))
            throw new BusinessException("La contraseña es requerida al crear un profesional");

        var usuario = new Usuario
        {
            Username     = req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12),
            Nombre       = req.Nombre,
            Apellido     = req.Apellido,
            Rol          = Rol.Profesional
        };
        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        var profesional = new Profesional
        {
            UsuarioId   = usuario.Id,
            CategoriaId = req.CategoriaId,
            Nombre      = req.Nombre,
            Apellido    = req.Apellido,
            Matricula   = req.Matricula
        };
        db.Profesionales.Add(profesional);
        await db.SaveChangesAsync();

        return await GetByIdAsync(profesional.Id);
    }

    public async Task<ProfesionalResponse> ActualizarAsync(long id, CrearProfesionalRequest req)
    {
        var p = await QueryBase().FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new NotFoundException($"Profesional {id} no encontrado");

        if (!await db.Categorias.AnyAsync(c => c.Id == req.CategoriaId && c.Activo))
            throw new NotFoundException($"Categoría {req.CategoriaId} no encontrada");

        p.Nombre      = req.Nombre;
        p.Apellido    = req.Apellido;
        p.Matricula   = req.Matricula;
        p.CategoriaId = req.CategoriaId;

        p.Usuario.Nombre   = req.Nombre;
        p.Usuario.Apellido = req.Apellido;

        if (!string.IsNullOrWhiteSpace(req.Password))
            p.Usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password, 12);

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task DesactivarAsync(long id)
    {
        var p = await QueryBase().FirstOrDefaultAsync(x => x.Id == id)
                ?? throw new NotFoundException($"Profesional {id} no encontrado");

        p.Activo         = false;
        p.Usuario.Activo = false;
        await db.SaveChangesAsync();
    }
}
