namespace SportyfyScoreBackend.Models;

public class FootballMatchEventDto
{
    public int MatchId { get; set; }
    public int TeamAId { get; set; }
    public string TeamAName { get; set; } = string.Empty;
    public int TeamBId { get; set; }
    public string TeamBName { get; set; } = string.Empty;
    public int TeamAScore { get; set; }
    public int TeamBScore { get; set; }
    public int CurrentMinute { get; set; }
    public int ExtraTime { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int TeamId { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int AssistPlayerId { get; set; }
    public string AssistPlayerName { get; set; } = string.Empty;
    public bool IsMatchOver { get; set; }
    public int RemainingSeconds { get; set; }
}

