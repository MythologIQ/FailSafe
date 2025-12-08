/// <reference types="node" />
import { FastifyPluginAsync } from 'fastify';

interface HealthOptions {
  includeDetails?: boolean;
}

const fastifyHealth: FastifyPluginAsync<HealthOptions> = async (fastify, options) => {
  const { includeDetails = false } = options;
  
  fastify.get('/health', async (request, reply) => {
    const startTime = Date.now();
    
    try {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      reply.status(503);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    }
  });

  // fastify.log.info('Health check endpoints initialized');
};

export default fastifyHealth;
