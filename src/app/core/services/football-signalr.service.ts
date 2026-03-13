import { Injectable, NgZone, signal } from '@angular/core';
import { FootballLiveUpdate } from '../models/football-live-update';

import * as signalR from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class FootballSignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentMatchId: number | null = null;
  private startPromise: Promise<signalR.HubConnection> | null = null;

  readonly connected = signal(false);
  readonly lastUpdate = signal<FootballLiveUpdate | null>(null);

  private readonly hubUrl = 'https://be.sportyfy.in/scoreHub';

  constructor(private readonly zone: NgZone) {}

  async connect(matchId: number): Promise<void> {
    if (!Number.isFinite(matchId) || matchId <= 0) return;
    if (this.connection && this.currentMatchId === matchId) return;
    if (this.startPromise && this.currentMatchId === matchId) {
      await this.startPromise;
      return;
    }

    await this.disconnect();
    this.currentMatchId = matchId;

    this.startPromise = this.startWebSocketConnection(matchId);

    try {
      const connection = await this.startPromise;
      this.connection = connection;
      this.zone.run(() => this.connected.set(true));
    } finally {
      this.startPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    const c = this.connection;
    const matchId = this.currentMatchId;
    this.connection = null;
    this.startPromise = null;
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

  private async startWebSocketConnection(matchId: number): Promise<signalR.HubConnection> {
    const connection = this.createConnection({
      transport: signalR.HttpTransportType.WebSockets,
      skipNegotiation: true,
      withCredentials: false
    });

    await connection.start();
    await connection.invoke('JoinMatchGroup', matchId);
    return connection;
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

    connection.onclose(() => {
      this.zone.run(() => this.connected.set(false));
      if (this.connection === connection) {
        this.connection = null;
      }
    });

    connection.onreconnected(async () => {
      this.zone.run(() => this.connected.set(true));
      if (this.currentMatchId !== null) {
        try {
          await connection.invoke('JoinMatchGroup', this.currentMatchId);
        } catch {
          // ignore
        }
      }
    });

    return connection;
  }

}
