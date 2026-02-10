/**
 * RoadmapServer - Express HTTP + WebSocket server for Cumulative Roadmap
 *
 * Serves the external browser-based roadmap visualization on port 9376.
 * Provides real-time updates via WebSocket for live activity streaming.
 */
import * as path from 'path';
import express, { Request, Response } from 'express';
import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PlanManager } from '../qorelogic/planning/PlanManager';
import { EventBus } from '../shared/EventBus';

const PORT = 9376;

export class RoadmapServer {
  private app: express.Application;
  private server: HttpServer | null = null;
  private wss: WebSocketServer | null = null;
  private planManager: PlanManager;
  private eventBus: EventBus;

  constructor(planManager: PlanManager, eventBus: EventBus) {
    this.planManager = planManager;
    this.eventBus = eventBus;
    this.app = express();
    this.setupRoutes();
    this.subscribeToEvents();
  }

  private setupRoutes(): void {
    // Serve static UI from the ui subfolder
    this.app.use(express.static(path.join(__dirname, 'ui')));

    // API: Get full roadmap state
    this.app.get('/api/roadmap', (_req: Request, res: Response) => {
      const sprints = this.planManager.getAllSprints();
      const currentSprint = this.planManager.getCurrentSprint();
      const activePlan = this.planManager.getActivePlan();
      res.json({ sprints, currentSprint, activePlan });
    });

    // API: Get specific sprint details
    this.app.get('/api/sprint/:id', (req: Request, res: Response) => {
      const sprintId = req.params.id as string;
      const sprint = this.planManager.getSprint(sprintId);
      const plan = sprint ? this.planManager.getPlan(sprint.planId) : null;
      res.json({ sprint, plan });
    });

    // API: Get all plans
    this.app.get('/api/plans', (_req: Request, res: Response) => {
      const plans = this.planManager.getAllPlans();
      res.json({ plans });
    });
  }

  private setupWebSocket(): void {
    if (!this.server) { return; }
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws) => {
      // Send initial state on connection
      const sprints = this.planManager.getAllSprints();
      const currentSprint = this.planManager.getCurrentSprint();
      const activePlan = this.planManager.getActivePlan();
      ws.send(JSON.stringify({ type: 'init', payload: { sprints, currentSprint, activePlan } }));
    });
  }

  /**
   * Broadcast a message to all connected WebSocket clients.
   */
  private broadcast(data: Record<string, unknown>): void {
    if (!this.wss) { return; }
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private subscribeToEvents(): void {
    // Stream plan events to connected clients
    this.eventBus.on('genesis.streamEvent' as never, (event: unknown) => {
      this.broadcast({ type: 'event', payload: event });
    });

    // Stream sentinel verdicts
    this.eventBus.on('sentinel.verdict' as never, (event: { payload: unknown }) => {
      this.broadcast({ type: 'verdict', payload: event.payload });
    });
  }

  start(): void {
    this.server = this.app.listen(PORT, () => {
      console.log(`Roadmap server: http://localhost:${PORT}`);
    });
    this.setupWebSocket();
  }

  stop(): void {
    this.wss?.close();
    this.server?.close();
  }

  getPort(): number {
    return PORT;
  }
}
