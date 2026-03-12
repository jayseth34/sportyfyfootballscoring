using Microsoft.AspNetCore.SignalR;

namespace SportyfyScoreBackend;

public class ScoreHub : Hub
{
    public Task JoinMatch(string matchId)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, matchId);
    }

    public Task JoinGroup(string group)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, group);
    }

    public Task Join(string group)
    {
        return Groups.AddToGroupAsync(Context.ConnectionId, group);
    }

    public Task LeaveMatch(string matchId)
    {
        return Groups.RemoveFromGroupAsync(Context.ConnectionId, matchId);
    }
}

