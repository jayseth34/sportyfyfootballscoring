using SportyfyScoreBackend.Models;

namespace SportyfyScoreBackend;

public interface IFootballScoreStore
{
    Task UpdateFootballAsync(FootballMatchEventDto dto);
    Task MarkMatchOverAsync(int matchId);
    FootballMatchStateDto? GetState(int matchId);
    IReadOnlyList<FootballMatchEventLogDto> GetEvents(int matchId);
}

