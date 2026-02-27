/**
 * API module barrel exports
 */

export { FailSafeApiServer } from './FailSafeApiServer';
export type { FailSafeApiServerOptions, FailSafeApiServices } from './FailSafeApiServer';
export { EventStreamBridge } from './EventStreamBridge';
export { createAuthMiddleware } from './middleware/auth';
