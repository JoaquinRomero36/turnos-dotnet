using System.Net;

namespace TurnosApi.Exceptions;

public class AppException(string message, string errorCode, HttpStatusCode status) : Exception(message)
{
    public string        ErrorCode { get; } = errorCode;
    public HttpStatusCode Status   { get; } = status;
}

public class NotFoundException(string message)
    : AppException(message, "NO_ENCONTRADO", HttpStatusCode.NotFound);

public class BusinessException(string message)
    : AppException(message, "NEGOCIO_ERROR", HttpStatusCode.BadRequest);

public class CupoCompletoException(string message)
    : AppException(message, "CUPO_COMPLETO", HttpStatusCode.Conflict);

public class ProfesionalOcupadoException(string message)
    : AppException(message, "PROFESIONAL_OCUPADO", HttpStatusCode.Conflict);

public class HorarioInvalidoException(string message)
    : AppException(message, "HORARIO_INVALIDO", HttpStatusCode.BadRequest);

public class ForbiddenException(string message)
    : AppException(message, "ACCESO_DENEGADO", HttpStatusCode.Forbidden);
