namespace SportyfyScoreBackend.Models;

public class FootballMatchStateDto
{
    public int MatchId { get; set; }
    public bool IsLive { get; set; }
    public FootballMatchEventDto LastUpdate { get; set; } = new();
}

