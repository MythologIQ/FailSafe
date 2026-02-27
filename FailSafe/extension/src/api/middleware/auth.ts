/**
 * Auth Middleware - Simple localhost + API key authentication
 *
 * Security model:
 * - Requests from 127.0.0.1 / ::1 are always allowed (localhost bypass)
 * - If an API key is configured, remote requests must provide Bearer token
 * - Returns 401 for unauthorized requests
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthOptions {
    apiKey?: string;
}

export function createAuthMiddleware(options: AuthOptions) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const remoteAddr = req.ip || req.socket.remoteAddress || '';

        // Localhost bypass: allow all requests from loopback addresses
        if (isLoopback(remoteAddr)) {
            next();
            return;
        }

        // If no API key is configured, reject all non-localhost requests
        if (!options.apiKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'API access is restricted to localhost',
            });
            return;
        }

        // Validate Bearer token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing or malformed Authorization header',
            });
            return;
        }

        const token = authHeader.slice(7);
        if (token !== options.apiKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API key',
            });
            return;
        }

        next();
    };
}

function isLoopback(addr: string): boolean {
    if (!addr) return false;
    // Normalize IPv6-mapped IPv4
    const normalized = addr.replace(/^::ffff:/, '');
    return normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost';
}
