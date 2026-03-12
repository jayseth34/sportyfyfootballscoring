import { Injectable, NgZone, signal } from '@angular/core';
import { FootballLiveUpdate } from '../models/football-live-update';

// NOTE: Requires `@microsoft/signalr` dependency.
import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class FootballSignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentMatchId: number | null = null;

  readonly connected = signal(false);
  readonly lastUpdate = signal<FootballLiveUpdate | null>(null);

  private readonly hubUrl = 'https://be.sportyfy.in/scoreHub';

  constructor(private readonly zone: NgZone) {}

  async connect(matchId: number): Promise<void> {
    if (!Number.isFinite(matchId) || matchId <= 0) return;
    if (this.connection && this.currentMatchId === matchId) return;

    await this.disconnect();
    this.currentMatchId = matchId;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveFootballUpdate', (dto: FootballLiveUpdate) => {
      // Ensure Angular change detection sees updates from SignalR.
      this.zone.run(() => {
        this.lastUpdate.set(dto);
      });
    });

    await connection.start();
    await connection.invoke('JoinMatchGroup', matchId);

    this.connection = connection;
    this.zone.run(() => this.connected.set(true));
  }

  async disconnect(): Promise<void> {
    const c = this.connection;
    const matchId = this.currentMatchId;
    this.connection = null;
    this.currentMatchId = null;
    this.zone.run(() => this.connected.set(false));
    if (!c) return;
    try {
      if (matchId !== null) {
        await c.invoke('LeaveMatchGroup', matchId);
      }
      await c.stop();
    } catch {
      // ignore
    }
  }

}
