using System.Collections.Concurrent;
using SportyfyScoreBackend.Models;

namespace SportyfyScoreBackend;

public class InMemoryFootballScoreStore : IFootballScoreStore
{
    private readonly ConcurrentDictionary<int, FootballMatchStateDto> _states = new();
    private readonly ConcurrentDictionary<int, ConcurrentQueue<FootballMatchEventLogDto>> _events = new();

    public Task UpdateFootballAsync(FootballMatchEventDto dto)
    {
        var isClockEvent = string.Equals(dto.EventType, "clock", StringComparison.OrdinalIgnoreCase);

        var nextState = new FootballMatchStateDto
        {
            MatchId = dto.MatchId,
            IsLive = !dto.IsMatchOver,
            LastUpdate = dto
        };

        _states.AddOrUpdate(dto.MatchId, nextState, (_, _) => nextState);

        if (!isClockEvent)
        {
            var queue = _events.GetOrAdd(dto.MatchId, _ => new ConcurrentQueue<FootballMatchEventLogDto>());
            queue.Enqueue(
                new FootballMatchEventLogDto
                {
                    Id = Guid.NewGuid(),
                    CreatedAtUtc = DateTime.UtcNow,
                    MatchId = dto.MatchId,
                    EventType = dto.EventType,
                    CurrentMinute = dto.CurrentMinute,
                    TeamId = dto.TeamId,
                    PlayerId = dto.PlayerId,
                    PlayerName = dto.PlayerName,
                    AssistPlayerId = dto.AssistPlayerId,
                    AssistPlayerName = dto.AssistPlayerName,
                    TeamAScore = dto.TeamAScore,
                    TeamBScore = dto.TeamBScore,
                    IsMatchOver = dto.IsMatchOver
                });
        }

        if (dto.IsMatchOver)
        {
            _states.AddOrUpdate(
                dto.MatchId,
                _ => nextState,
                (_, prev) =>
                {
                    prev.IsLive = false;
                    prev.LastUpdate.IsMatchOver = true;
                    return prev;
                });
        }

        return Task.CompletedTask;
    }

    public Task MarkMatchOverAsync(int matchId)
    {
        _states.AddOrUpdate(
            matchId,
            _ => new FootballMatchStateDto
            {
                MatchId = matchId,
                IsLive = false,
                LastUpdate = new FootballMatchEventDto
                {
                    MatchId = matchId,
                    IsMatchOver = true,
                    EventType = "match-over"
                }
            },
            (_, prev) =>
            {
                prev.IsLive = false;
                prev.LastUpdate.IsMatchOver = true;
                prev.LastUpdate.EventType = "match-over";
                return prev;
            });

        var queue = _events.GetOrAdd(matchId, _ => new ConcurrentQueue<FootballMatchEventLogDto>());
        queue.Enqueue(
            new FootballMatchEventLogDto
            {
                Id = Guid.NewGuid(),
                CreatedAtUtc = DateTime.UtcNow,
                MatchId = matchId,
                EventType = "match-over",
                IsMatchOver = true
            });

        return Task.CompletedTask;
    }

    public FootballMatchStateDto? GetState(int matchId)
    {
        return _states.TryGetValue(matchId, out var state) ? state : null;
    }

    public IReadOnlyList<FootballMatchEventLogDto> GetEvents(int matchId)
    {
        if (!_events.TryGetValue(matchId, out var queue)) return Array.Empty<FootballMatchEventLogDto>();
        return queue.ToArray().OrderBy(x => x.CreatedAtUtc).ToList();
    }
}

