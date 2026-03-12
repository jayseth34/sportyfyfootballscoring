using Microsoft.AspNetCore.SignalR;
using SportyfyScoreBackend;
using SportyfyScoreBackend.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<IFootballScoreStore, InMemoryFootballScoreStore>();

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "ui",
        policy =>
        {
            policy.WithOrigins("http://localhost:4200", "https://sportyfy.in")
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
        });
});

var app = builder.Build();

app.UseCors("ui");
app.MapGet("/", () => "Sportyfy Score Backend");

app.MapPost(
    "/api/Score/update-football",
    async (
        FootballMatchEventDto dto,
        IFootballScoreStore store,
        IHubContext<ScoreHub> hub) =>
    {
        await store.UpdateFootballAsync(dto);
        await hub.Clients.Group(dto.MatchId.ToString()).SendAsync("ReceiveFootballUpdate", dto);

        return Results.Ok(ApiResponse<string>.Success("Score updated successfully", "update"));
    });

app.MapGet(
    "/api/Score/MatchOver",
    async (int matchId, IFootballScoreStore store, IHubContext<ScoreHub> hub) =>
    {
        await store.MarkMatchOverAsync(matchId);
        await hub.Clients.Group(matchId.ToString()).SendAsync(
            "ReceiveFootballUpdate",
            new FootballMatchEventDto
            {
                MatchId = matchId,
                EventType = "match-over",
                IsMatchOver = true
            });

        return Results.Ok(ApiResponse<bool>.Success("Match Details Updated", false));
    });

app.MapGet(
    "/api/Score/football/{matchId:int}/state",
    (int matchId, IFootballScoreStore store) =>
    {
        var state = store.GetState(matchId);
        return state is null
            ? Results.NotFound(ApiResponse<string>.Failure("Match not found"))
            : Results.Ok(ApiResponse<FootballMatchStateDto>.Success("Match state fetched", state));
    });

app.MapGet(
    "/api/Score/football/{matchId:int}/events",
    (int matchId, IFootballScoreStore store) =>
    {
        var events = store.GetEvents(matchId);
        return Results.Ok(ApiResponse<IReadOnlyList<FootballMatchEventLogDto>>.Success("Events fetched", events));
    });

app.MapHub<ScoreHub>("/scoreHub");

app.Run();
