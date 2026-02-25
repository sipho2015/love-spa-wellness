using LoveSpaBackend.DTOs.Auth;
using LoveSpaBackend.Models;

namespace LoveSpaBackend.Services;

public interface IJwtTokenService
{
    AuthResponseDto CreateToken(User user);
}
