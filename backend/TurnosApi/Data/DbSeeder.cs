using TurnosApi.Entities;

namespace TurnosApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (!db.Categorias.Any())
        {
            db.Categorias.AddRange(
                new Categoria { Nombre = "Traumatología",       Descripcion = "Patologías del sistema musculoesquelético" },
                new Categoria { Nombre = "Cardio Respiratorio", Descripcion = "Afecciones cardíacas y respiratorias"      },
                new Categoria { Nombre = "Neurología",          Descripcion = "Patologías del sistema nervioso"           },
                new Categoria { Nombre = "Dermatofuncional",    Descripcion = "Dermatología y terapia funcional"          }
            );
            await db.SaveChangesAsync();
        }

        if (!db.Usuarios.Any())
        {
            // Contraseña para todos: password123
            static string Hash(string pw) => BCrypt.Net.BCrypt.HashPassword(pw, 12);
            const string pw = "password123";

            db.Usuarios.AddRange(
                new Usuario { Username = "secretario",  PasswordHash = Hash(pw), Nombre = "Admin",  Apellido = "Sistema",  Rol = Rol.Secretario  },
                new Usuario { Username = "operadora01", PasswordHash = Hash(pw), Nombre = "María",  Apellido = "González", Rol = Rol.Operadora   },
                new Usuario { Username = "operadora02", PasswordHash = Hash(pw), Nombre = "Laura",  Apellido = "Martínez", Rol = Rol.Operadora   },
                new Usuario { Username = "dr.lopez",    PasswordHash = Hash(pw), Nombre = "Carlos", Apellido = "López",    Rol = Rol.Profesional },
                new Usuario { Username = "dra.garcia",  PasswordHash = Hash(pw), Nombre = "Ana",    Apellido = "García",   Rol = Rol.Profesional },
                new Usuario { Username = "dr.romero",   PasswordHash = Hash(pw), Nombre = "Pablo",  Apellido = "Romero",   Rol = Rol.Profesional },
                new Usuario { Username = "dra.silva",   PasswordHash = Hash(pw), Nombre = "Sofía",  Apellido = "Silva",    Rol = Rol.Profesional }
            );
            await db.SaveChangesAsync();
        }

        if (!db.Profesionales.Any())
        {
            var cats  = db.Categorias.ToDictionary(c => c.Nombre);
            var users = db.Usuarios.Where(u => u.Rol == Rol.Profesional).ToDictionary(u => u.Username);

            db.Profesionales.AddRange(
                new Profesional { UsuarioId = users["dr.lopez"].Id,   CategoriaId = cats["Traumatología"].Id,       Nombre = "Carlos", Apellido = "López",  Matricula = "MP-12345" },
                new Profesional { UsuarioId = users["dra.garcia"].Id, CategoriaId = cats["Cardio Respiratorio"].Id, Nombre = "Ana",    Apellido = "García", Matricula = "MP-23456" },
                new Profesional { UsuarioId = users["dr.romero"].Id,  CategoriaId = cats["Neurología"].Id,          Nombre = "Pablo",  Apellido = "Romero", Matricula = "MP-34567" },
                new Profesional { UsuarioId = users["dra.silva"].Id,  CategoriaId = cats["Dermatofuncional"].Id,    Nombre = "Sofía",  Apellido = "Silva",  Matricula = "MP-45678" }
            );
            await db.SaveChangesAsync();
        }

        if (!db.Pacientes.Any())
        {
            db.Pacientes.AddRange(
                new Paciente { Nombre = "Juan",     Apellido = "Rodríguez", Dni = "32145678", Telefono = "351-4567890" },
                new Paciente { Nombre = "María",    Apellido = "Fernández", Dni = "28765432", Telefono = "351-9876543" },
                new Paciente { Nombre = "Roberto",  Apellido = "Díaz",      Dni = "35432109", Telefono = "351-1234567" },
                new Paciente { Nombre = "Patricia", Apellido = "Morales",   Dni = "30987654", Telefono = "351-5678901" }
            );
            await db.SaveChangesAsync();
        }
    }
}
