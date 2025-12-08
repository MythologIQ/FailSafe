/// <reference types="node" />
import { FastifyPluginAsync, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

interface MetricsOptions {
  storagePath?: string;
  retentionDays?: number;
}

const fastifyMetrics: FastifyPluginAsync<MetricsOptions> = async (fastify: FastifyInstance, options: MetricsOptions) => {
  const { storagePath = '.failsafe/metrics.json', retentionDays = 30 } = options;
  
  // Basic implementation for scaffolding - will expand later
  fastify.decorate('trackValidation', () => {});
  fastify.decorate('trackRuleTrigger', () => {});
  fastify.decorate('trackTaskEvent', () => {});
  
  fastify.get('/metrics', async () => {
      return { status: "Metrics Active (Placeholder)" };
  });

  // fastify.log.info('Metrics plugin initialized');
};

// Extend FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    trackValidation: () => void;
    trackRuleTrigger: () => void;
    trackTaskEvent: () => void;
  }
}

export default fastifyMetrics;
