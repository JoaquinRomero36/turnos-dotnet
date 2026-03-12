using System.Net;
using System.Text.Json;
using TurnosApi.DTOs.Responses;
using TurnosApi.Exceptions;

namespace TurnosApi.Middleware;

public class ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await next(ctx);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error no manejado: {Message}", ex.Message);
            await HandleAsync(ctx, ex);
        }
    }

    private static async Task HandleAsync(HttpContext ctx, Exception ex)
    {
        ctx.Response.ContentType = "application/json";

        ErrorResponse response = ex switch
        {
            AppException app => new ErrorResponse(app.ErrorCode, app.Message),
            UnauthorizedAccessException => new ErrorResponse("NO_AUTENTICADO", "No autenticado"),
            _ => new ErrorResponse("ERROR_INTERNO", "Error interno del servidor")
        };

        ctx.Response.StatusCode = ex switch
        {
            AppException app => (int)app.Status,
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            _ => (int)HttpStatusCode.InternalServerError
        };

        await ctx.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOpts));
    }
}
