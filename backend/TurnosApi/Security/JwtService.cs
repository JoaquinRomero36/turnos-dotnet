using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TurnosApi.Entities;

namespace TurnosApi.Security;

public class JwtService(IConfiguration config)
{
    private readonly string _secret   = config["Jwt:Secret"]           ?? throw new InvalidOperationException("JWT Secret no configurado");
    private readonly string _issuer   = config["Jwt:Issuer"]           ?? "TurnosApi";
    private readonly string _audience = config["Jwt:Audience"]         ?? "TurnosFrontend";
    private readonly int    _hours    = int.Parse(config["Jwt:ExpirationHours"] ?? "8");

    public string GenerateToken(Usuario usuario)
    {
        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        Claim[] claims =
        [
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Name,           usuario.Username),
            new(ClaimTypes.Role,           usuario.Rol.ToString()),
            new("nombre",                  usuario.Nombre),
            new("apellido",                usuario.Apellido),
        ];

        var token = new JwtSecurityToken(
            issuer:             _issuer,
            audience:           _audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(_hours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
