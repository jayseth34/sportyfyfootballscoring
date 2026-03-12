namespace SportyfyScoreBackend.Models;

public class FootballMatchEventLogDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int MatchId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int CurrentMinute { get; set; }
    public int TeamId { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int AssistPlayerId { get; set; }
    public string AssistPlayerName { get; set; } = string.Empty;
    public int TeamAScore { get; set; }
    public int TeamBScore { get; set; }
    public bool IsMatchOver { get; set; }
}

