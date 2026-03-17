using TurnosApi.Entities;
using System.Globalization;
using Microsoft.EntityFrameworkCore;

namespace TurnosApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // 1. Limpiar turnos existentes para empezar de cero
        if (db.Turnos.Any())
        {
            db.Turnos.RemoveRange(db.Turnos);
            await db.SaveChangesAsync();
        }

        // 2. Sembrar categorías
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

        // 3. Sembrar usuarios
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

        // 4. Sembrar profesionales
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

        // 5. Sembrar pacientes
        if (!db.Pacientes.Any())
        {
            db.Pacientes.AddRange(
                new Paciente { Nombre = "Juan",     Apellido = "Rodríguez", Dni = "32145678", Telefono = "351-4567890" },
                new Paciente { Nombre = "María",    Apellido = "Fernández", Dni = "28765432", Telefono = "351-9876543" },
                new Paciente { Nombre = "Roberto",  Apellido = "Díaz",      Dni = "35432109", Telefono = "351-1234567" },
                new Paciente { Nombre = "Patricia", Apellido = "Morales",   Dni = "30987654", Telefono = "351-5678901" },
                new Paciente { Nombre = "Fernando", Apellido = "Gomez",     Dni = "33123456", Telefono = "351-1122334" },
                new Paciente { Nombre = "Ana",      Apellido = "Lopez",     Dni = "34567890", Telefono = "351-4455667" },
                new Paciente { Nombre = "Pedro",    Apellido = "Martinez",  Dni = "35678901", Telefono = "351-7788990" },
                new Paciente { Nombre = "Lucia",    Apellido = "Perez",     Dni = "36789012", Telefono = "351-0011223" },
                new Paciente { Nombre = "Mateo",    Apellido = "Sanchez",   Dni = "37890123", Telefono = "351-3344556" },
                new Paciente { Nombre = "Carla",    Apellido = "Romero",    Dni = "38901234", Telefono = "351-6677889" }
            );
            await db.SaveChangesAsync();
        }

        // 6. Sembrar turnos para marzo 2026 (si no hay turnos)
        if (!db.Turnos.Any())
        {
            var profesionales = db.Profesionales.Include(p => p.Usuario).ToList();
            var pacientes = db.Pacientes.ToList();
            var secretario = db.Usuarios.First(u => u.Username == "secretario");

            var rng = new Random();
            var startDate = new DateTime(2026, 3, 1);
            var endDate = new DateTime(2026, 3, 31);

            // Lista para verificar duplicados en memoria antes de agregar a DB
            var turnosGenerados = new HashSet<(long ProfesionalId, DateTime FechaHora)>();

            for (var date = startDate; date <= endDate; date = date.AddDays(1))
            {
                // Solo lunes a viernes
                if (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday) continue;

                // Generar entre 2 y 5 turnos por día
                int turnosHoy = rng.Next(2, 6);
                int intentos = 0;
                int turnosCreados = 0;
                
                while (turnosCreados < turnosHoy && intentos < 20) // Límite de intentos para evitar bucle infinito
                {
                    intentos++;
                    var prof = profesionales[rng.Next(profesionales.Count)];
                    var pac = pacientes[rng.Next(pacientes.Count)];
                    
                    // Hora entre 11:00 y 14:00 UTC (corresponde a 08:00-11:00 en horario local Argentina UTC-3)
                    // La regla de negocio dice 08:00-11:00, asumiendo horario local de la clínica.
                    // Si la clínica está en UTC-3, 08:00 local = 11:00 UTC.
                    int hour = rng.Next(11, 15); 
                    var fechaHora = date.AddHours(hour);
                    var fechaHoraUtc = DateTime.SpecifyKind(fechaHora, DateTimeKind.Utc);

                    // Verificar duplicados
                    if (turnosGenerados.Contains((prof.Id, fechaHoraUtc)))
                    {
                        continue; // Intentar con otro profesional u hora
                    }

                    // 70% de probabilidad de ser activo, 30% cancelado
                    bool esCancelado = rng.NextDouble() < 0.3;
                    
                    var turno = new Turno
                    {
                        PacienteId = pac.Id,
                        ProfesionalId = prof.Id,
                        CategoriaId = prof.CategoriaId,
                        FechaHora = fechaHoraUtc,
                        DescripcionProblema = $"Dolor {rng.Next(1, 100)}", // Simulación de motivo de consulta
                        Estado = esCancelado ? EstadoTurno.Cancelado : EstadoTurno.Activo,
                        CreadoPorId = secretario.Id,
                        CreatedAt = DateTime.UtcNow,
                    };

                    if (esCancelado)
                    {
                        turno.CanceladoAt = DateTime.UtcNow;
                        turno.CanceladoPorId = secretario.Id;
                        turno.MotivoCancelacion = "Paciente no asistió / Emergencia / Otro motivo";
                    }

                    db.Turnos.Add(turno);
                    turnosGenerados.Add((prof.Id, fechaHoraUtc));
                    turnosCreados++;
                }
            }
            await db.SaveChangesAsync();
        }
    }
}