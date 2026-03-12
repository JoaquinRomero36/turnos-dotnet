# 🏥 Sistema de Gestión de Turnos — Centro de Salud

Aplicación interna para la gestión de turnos telefónicos del personal médico.

---

## 📦 Stack

| Capa | Tecnología | Versión |
|------|------------|---------|
| Backend | ASP.NET Core Web API | **.NET 9** |
| ORM | Entity Framework Core (Code First) | **9.0.2** |
| Base de datos | PostgreSQL | **15** |
| Frontend | Angular (Standalone + Signals) | **18.2** |
| Autenticación | JWT Bearer | — |
| Hashing | BCrypt.Net | 4.0.3 |
| IDE recomendado | Visual Studio 2022 | 17.11+ |

---

## 🚀 Cómo levantar el proyecto

### Requisitos previos

- .NET 9 SDK → https://dot.net/download
- Node.js 20+ y Angular CLI 18 → `npm install -g @angular/cli@18`
- PostgreSQL 15 corriendo en localhost:5432

### Backend

```bash
# 1. Asegurate que PostgreSQL esté corriendo y que exista el usuario postgres

# 2. Entrar al proyecto
cd backend/TurnosApi

# 3. Aplicar migraciones + seed automático (se ejecuta al iniciar)
dotnet run
# La primera vez crea la BD, aplica el schema y carga los datos de prueba.
```

> **Visual Studio 2022:** Abrí `backend/TurnosApi.sln`, establecé `TurnosApi` como proyecto de inicio y presioná F5.

El backend queda disponible en:
- API: `http://localhost:5000` (o el puerto que asigne VS)
- Swagger UI: `http://localhost:5000/swagger`

### Configurar connection string (si es necesario)

Editá `backend/TurnosApi/appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=turnos_db;Username=postgres;Password=TU_PASSWORD"
}
```

O usá User Secrets (recomendado para desarrollo):
```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;...;Password=TU_PASSWORD"
```

### Frontend

```bash
cd frontend
npm install
ng serve
# Disponible en http://localhost:4200
```

### Con Docker Compose (todo en uno)

```bash
docker-compose up -d
# Luego iniciá el frontend manualmente:
cd frontend && npm install && ng serve
```

---

## 👥 Usuarios de prueba

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `secretario` | `password123` | Secretario |
| `operadora01` | `password123` | Operadora |
| `operadora02` | `password123` | Operadora |
| `dr.lopez` | `password123` | Profesional — Traumatología |
| `dra.garcia` | `password123` | Profesional — Cardio Respiratorio |
| `dr.romero` | `password123` | Profesional — Neurología |
| `dra.silva` | `password123` | Profesional — Dermatofuncional |

---

## 📁 Estructura del Proyecto

```
turnos-dotnet/
├── backend/
│   ├── TurnosApi.sln                        ← Abrir en Visual Studio
│   └── TurnosApi/
│       ├── Controllers/
│       │   ├── AuthController.cs
│       │   ├── TurnosController.cs
│       │   └── OtrosControllers.cs          ← Profesionales, Categorías, Estadísticas
│       ├── Data/
│       │   ├── AppDbContext.cs               ← EF Core + configuración de entidades
│       │   ├── DbSeeder.cs                   ← Datos iniciales
│       │   └── Migrations/                   ← EF Core migrations
│       ├── DTOs/
│       │   ├── Requests/Requests.cs
│       │   └── Responses/Responses.cs
│       ├── Entities/Entities.cs              ← Todas las entidades + enums
│       ├── Exceptions/AppExceptions.cs
│       ├── Middleware/ErrorHandlingMiddleware.cs
│       ├── Security/JwtService.cs
│       ├── Services/
│       │   ├── AuthService.cs
│       │   ├── TurnoService.cs               ← Toda la lógica de negocio
│       │   ├── ProfesionalService.cs
│       │   └── EstadisticaService.cs
│       ├── appsettings.json
│       └── Program.cs
│
├── frontend/                                 ← Angular 18
│   └── src/app/
│       ├── core/
│       │   ├── auth/auth.service.ts          ← Signals, sessionStorage
│       │   ├── auth/services.ts              ← HTTP services
│       │   ├── guards/guards.ts              ← authGuard, roleGuard
│       │   ├── interceptors/jwt.interceptor.ts
│       │   └── models/models.ts
│       ├── features/
│       │   ├── auth/login/
│       │   ├── dashboard/
│       │   ├── calendario/                   ← Calendario CSS Grid hecho a mano
│       │   ├── profesionales/               ← CRUD (Secretario)
│       │   └── estadisticas/                ← Gráficos SVG nativos
│       └── shared/components/layout.component.ts
│
└── docker-compose.yml
```

---

## 📋 Reglas de negocio implementadas

| Regla | Dónde se valida |
|-------|-----------------|
| Solo L-V, 08-11 hs en punto | `TurnoService.ValidarFechaHora()` |
| Máx. 3 turnos activos por categoría/hora | `TurnoService.CrearAsync()` |
| 1 turno por profesional por hora | DB UNIQUE + `TurnoService` |
| Profesional pertenece a 1 sola categoría | DB FK + validación de coherencia |
| Sin reprogramación automática | Por diseño — solo cancelar + crear |
| Profesional solo ve/cancela sus propios turnos | `TurnoService` + JWT claims |

---

## 🔌 Endpoints REST

```
POST  /api/auth/login
GET   /api/auth/me

GET   /api/turnos/calendario?fechaInicio=&fechaFin=&categoriaId=
GET   /api/turnos/disponibles?fecha=&categoriaId=
GET   /api/turnos/{id}
POST  /api/turnos
PATCH /api/turnos/{id}/cancelar

GET   /api/profesionales?categoriaId=
GET   /api/profesionales/{id}
POST  /api/profesionales        [Secretario]
PUT   /api/profesionales/{id}   [Secretario]
DELETE/api/profesionales/{id}   [Secretario]

GET   /api/categorias

GET   /api/estadisticas/resumen?desde=&hasta=   [Secretario]
```

---

## ⚙️ Variables de entorno / appsettings

| Clave | Default | Descripción |
|-------|---------|-------------|
| `ConnectionStrings:DefaultConnection` | localhost/postgres | Connection string PostgreSQL |
| `Jwt:Secret` | (incluido) | Clave JWT — cambiá en producción |
| `Jwt:ExpirationHours` | `8` | Duración del token |
| `Cors:AllowedOrigin` | `http://localhost:4200` | Origen del frontend |

---

## 🧩 Funcionalidades por rol

| Pantalla | Operadora | Profesional | Secretario |
|----------|-----------|-------------|------------|
| Login | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ |
| Calendario (ver) | Por categoría | Solo propios | Todos |
| Crear turno | ✅ | ✅ (auto-completa) | ✅ |
| Cancelar turno | ✅ | Solo propios | ✅ |
| Gestión profesionales | ❌ | ❌ | ✅ |
| Estadísticas con gráficos | ❌ | ❌ | ✅ |
