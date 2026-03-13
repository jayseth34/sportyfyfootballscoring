import { Injectable, NgZone, signal } from '@angular/core';
import { FootballLiveUpdate } from '../models/football-live-update';

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

    const connection = await this.startWithFallback(matchId);
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

  private async startWithFallback(matchId: number): Promise<signalR.HubConnection> {
    const attempts: Array<signalR.IHttpConnectionOptions | undefined> = [
      undefined,
      {
        transport: signalR.HttpTransportType.LongPolling,
        withCredentials: false
      }
    ];

    let lastError: unknown;

    for (const options of attempts) {
      const connection = this.createConnection(options);
      try {
        await connection.start();
        await connection.invoke('JoinMatchGroup', matchId);
        return connection;
      } catch (error) {
        lastError = error;
        try {
          await connection.stop();
        } catch {
          // ignore cleanup failures
        }
      }
    }

    throw lastError;
  }

  private createConnection(options?: signalR.IHttpConnectionOptions): signalR.HubConnection {
    const builder = new signalR.HubConnectionBuilder();
    if (options) {
      builder.withUrl(this.hubUrl, options);
    } else {
      builder.withUrl(this.hubUrl);
    }

    const connection = builder.withAutomaticReconnect().build();

    connection.on('ReceiveFootballUpdate', (dto: FootballLiveUpdate) => {
      this.zone.run(() => {
        this.lastUpdate.set(dto);
      });
    });

    return connection;
  }

}
