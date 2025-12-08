/// <reference types="node" />
import fastify, { FastifyInstance } from 'fastify';
import { Logger } from './logger';
import * as net from 'net';
import fastifyHealth from './plugins/fastify-health';
import fastifyMetrics from './plugins/fastify-metrics';
import { ProjectPlan } from './projectPlan';
import { TaskEngine } from './taskEngine';
import {
    INotificationService,
    IDocumentService,
    IWorkspaceService,
    IInputService
} from '../core/interfaces';

export class FailSafeServer {
    private readonly server: FastifyInstance;
    private readonly logger: Logger;
    private port = 0;
    private isRunning = false;
    private taskEngine: TaskEngine;
    private projectPlan: ProjectPlan;

    constructor(
        logger: Logger,
        notificationService: INotificationService,
        documentService: IDocumentService,
        workspaceService: IWorkspaceService,
        inputService: IInputService
    ) {
        this.logger = logger;
        this.projectPlan = new ProjectPlan(this.logger, workspaceService, inputService);
        this.taskEngine = new TaskEngine(this.projectPlan, this.logger, notificationService, documentService);
        
        this.server = fastify({
            logger: {
                level: 'info'
            }
        });
    }

    private async findAvailablePort(startPort: number): Promise<number> {
        return new Promise((resolve, reject) => {
            const server = net.createServer();
            server.listen(startPort, () => {
                const address = server.address();
                const port = typeof address === 'string' ? parseInt(address.split(':')[1]) : address?.port;
                server.close(() => {
                    if (port) {
                        resolve(port);
                    } else {
                        reject(new Error('Could not determine port'));
                    }
                });
            });
            server.on('error', () => {
                this.findAvailablePort(startPort + 1).then(resolve).catch(reject);
            });
        });
    }

    public async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing FailSafe Fastify server...');

            // Find available port
            this.port = await this.findAvailablePort(3000);
            this.logger.info(`Found available port: ${this.port}`);

            // Register core plugins
            await this.registerPlugins();

            await this.registerRoutes();
            await this.registerApiRoutes();
            
            // Start the server
            await this.start();

            // Initialize Brain
            await this.taskEngine.initialize();
            this.taskEngine.start();

            this.logger.info(`FailSafe server started on port ${this.port}`);
        } catch (error) {
            this.logger.error('Failed to initialize FailSafe server:', error);
            throw error;
        }
    }

    private async registerPlugins(): Promise<void> {
        try {
            // Register health check plugin
            await this.server.register(fastifyHealth, {
                includeDetails: true
            });

            // Register metrics plugin
            await this.server.register(fastifyMetrics, {
                storagePath: '.failsafe/metrics.json',
                retentionDays: 30
            });

            this.logger.info('Core Fastify plugins registered successfully');
        } catch (error) {
            this.logger.error('Failed to register Fastify plugins:', error);
            throw error;
        }
    }

    private async registerRoutes(): Promise<void> {
        // Core API routes
        this.server.get('/status', async () => {
            return {
                version: '2.0.1', // Genesis Edition
                port: this.port,
                status: 'FailSafe Active',
                brain: 'Connected'
            };
        });

        this.logger.info('Core routes registered successfully');
    }

    private async registerApiRoutes(): Promise<void> {
        // GET /api/task - Get current active task
        this.server.get('/api/task', async () => {
            const status = this.taskEngine.getProjectStatus();
            return {
                currentTask: status.currentTask,
                nextTask: status.nextTask
            };
        });

        // GET /api/task/all - Get all tasks (Debugging)
        this.server.get('/api/task/all', async () => {
            return this.projectPlan.getAllTasks();
        });

        // POST /api/task/complete - Complete current task
        this.server.post<{ Body: { taskId: string } }>('/api/task/complete', async (request, reply) => {
            const result = await this.taskEngine.completeTask(request.body.taskId);
            if (result.success) {
                return { status: 'success' };
            } else {
                reply.code(400);
                return { status: 'error', message: result.error };
            }
        });
    }

    private async start(): Promise<void> {
        try {
            await this.server.listen({ port: this.port, host: '127.0.0.1' });
            this.isRunning = true;
        } catch (error) {
            this.logger.error('Failed to start server:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (this.isRunning) {
            this.taskEngine.stop();
            await this.server.close();
            this.isRunning = false;
        }
    }
    
    public getPort(): number {
        return this.port;
    }

    public getTaskEngine(): TaskEngine {
        return this.taskEngine;
    }
}
