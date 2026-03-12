using Microsoft.EntityFrameworkCore;
using TurnosApi.Entities;

namespace TurnosApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Categoria>   Categorias    => Set<Categoria>();
    public DbSet<Usuario>     Usuarios      => Set<Usuario>();
    public DbSet<Profesional> Profesionales => Set<Profesional>();
    public DbSet<Paciente>    Pacientes     => Set<Paciente>();
    public DbSet<Turno>       Turnos        => Set<Turno>();

    protected override void OnModelCreating(ModelBuilder m)
    {
        base.OnModelCreating(m);

        // ── Categoria ────────────────────────────────────────
        m.Entity<Categoria>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Nombre).HasMaxLength(100).IsRequired();
            e.HasIndex(c => c.Nombre).IsUnique();
        });

        // ── Usuario ──────────────────────────────────────────
        m.Entity<Usuario>(e =>
        {
            e.HasKey(u => u.Id);
            e.Property(u => u.Username).HasMaxLength(50).IsRequired();
            e.HasIndex(u => u.Username).IsUnique();
            e.Property(u => u.PasswordHash).HasMaxLength(255).IsRequired();
            e.Property(u => u.Nombre).HasMaxLength(100).IsRequired();
            e.Property(u => u.Apellido).HasMaxLength(100).IsRequired();
            e.Property(u => u.Rol).HasConversion<string>().HasMaxLength(20);
        });

        // ── Profesional ──────────────────────────────────────
        m.Entity<Profesional>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Nombre).HasMaxLength(100).IsRequired();
            e.Property(p => p.Apellido).HasMaxLength(100).IsRequired();
            e.Property(p => p.Matricula).HasMaxLength(50).IsRequired();
            e.HasIndex(p => p.Matricula).IsUnique();
            e.HasIndex(p => p.UsuarioId).IsUnique();
            e.Ignore(p => p.NombreCompleto);

            e.HasOne(p => p.Usuario)
             .WithOne(u => u.Profesional)
             .HasForeignKey<Profesional>(p => p.UsuarioId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(p => p.Categoria)
             .WithMany(c => c.Profesionales)
             .HasForeignKey(p => p.CategoriaId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Paciente ──────────────────────────────────────────
        m.Entity<Paciente>(e =>
        {
            e.HasKey(p => p.Id);
            e.Property(p => p.Dni).HasMaxLength(20).IsRequired();
            e.HasIndex(p => p.Dni).IsUnique();
        });

        // ── Turno ─────────────────────────────────────────────
        m.Entity<Turno>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Estado).HasConversion<string>().HasMaxLength(20);

            // Regla de negocio: 1 turno por profesional por hora
            e.HasIndex(t => new { t.ProfesionalId, t.FechaHora })
             .IsUnique()
             .HasDatabaseName("uq_profesional_fecha_hora");

            e.HasOne(t => t.Paciente)
             .WithMany(p => p.Turnos)
             .HasForeignKey(t => t.PacienteId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.Profesional)
             .WithMany(p => p.Turnos)
             .HasForeignKey(t => t.ProfesionalId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.Categoria)
             .WithMany()
             .HasForeignKey(t => t.CategoriaId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(t => t.CreadoPor)
             .WithMany()
             .HasForeignKey(t => t.CreadoPorId)
             .OnDelete(DeleteBehavior.SetNull);

            e.HasOne(t => t.CanceladoPor)
             .WithMany()
             .HasForeignKey(t => t.CanceladoPorId)
             .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
