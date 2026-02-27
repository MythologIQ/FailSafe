import { strict as assert } from 'assert';
import { describe, it } from 'mocha';
import { createAuthMiddleware, AuthOptions } from '../../api/middleware/auth';

/**
 * Minimal mock for Express Request object.
 * Only the fields consumed by createAuthMiddleware are included.
 */
function createMockReq(overrides: {
    ip?: string;
    remoteAddress?: string;
    authorization?: string;
}): any {
    return {
        ip: overrides.ip,
        socket: {
            remoteAddress: overrides.remoteAddress ?? overrides.ip,
        },
        headers: {
            authorization: overrides.authorization,
        },
    };
}

/**
 * Minimal mock for Express Response object.
 * Captures status code and JSON body for assertion.
 */
function createMockRes(): any {
    const res: any = {
        _statusCode: 0,
        _json: null,
        status(code: number) {
            res._statusCode = code;
            return res;
        },
        json(body: unknown) {
            res._json = body;
            return res;
        },
    };
    return res;
}

describe('Auth Middleware', () => {
    describe('localhost bypass', () => {
        it('allows requests from 127.0.0.1 without API key', () => {
            const middleware = createAuthMiddleware({});
            const req = createMockReq({ ip: '127.0.0.1' });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, true);
            assert.equal(res._statusCode, 0);
        });

        it('allows requests from IPv6 loopback ::1', () => {
            const middleware = createAuthMiddleware({});
            const req = createMockReq({ ip: '::1' });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, true);
        });

        it('allows requests from IPv6-mapped IPv4 loopback ::ffff:127.0.0.1', () => {
            const middleware = createAuthMiddleware({});
            const req = createMockReq({ ip: '::ffff:127.0.0.1' });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, true);
        });

        it('allows localhost string', () => {
            const middleware = createAuthMiddleware({});
            const req = createMockReq({ ip: 'localhost' });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, true);
        });
    });

    describe('non-localhost without API key configured', () => {
        it('returns 401 for non-localhost request when no API key is configured', () => {
            const middleware = createAuthMiddleware({});
            const req = createMockReq({ ip: '192.168.1.100' });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res._statusCode, 401);
            assert.ok(res._json);
            assert.equal(res._json.error, 'Unauthorized');
        });
    });

    describe('non-localhost with API key configured', () => {
        const options: AuthOptions = { apiKey: 'test-secret-key-12345' };

        it('allows request with valid Bearer token', () => {
            const middleware = createAuthMiddleware(options);
            const req = createMockReq({
                ip: '10.0.0.5',
                authorization: 'Bearer test-secret-key-12345',
            });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, true);
            assert.equal(res._statusCode, 0);
        });

        it('returns 401 for invalid Bearer token', () => {
            const middleware = createAuthMiddleware(options);
            const req = createMockReq({
                ip: '10.0.0.5',
                authorization: 'Bearer wrong-key',
            });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res._statusCode, 401);
            assert.equal(res._json.message, 'Invalid API key');
        });

        it('returns 401 when Authorization header is missing', () => {
            const middleware = createAuthMiddleware(options);
            const req = createMockReq({ ip: '10.0.0.5' });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res._statusCode, 401);
        });

        it('returns 401 when Authorization header is not Bearer scheme', () => {
            const middleware = createAuthMiddleware(options);
            const req = createMockReq({
                ip: '10.0.0.5',
                authorization: 'Basic dXNlcjpwYXNz',
            });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, false);
            assert.equal(res._statusCode, 401);
            assert.ok(res._json.message.includes('Missing or malformed'));
        });
    });

    describe('localhost with API key configured', () => {
        it('allows localhost even without providing a Bearer token', () => {
            const middleware = createAuthMiddleware({ apiKey: 'some-key' });
            const req = createMockReq({ ip: '127.0.0.1' });
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            assert.equal(nextCalled, true);
            assert.equal(res._statusCode, 0);
        });
    });

    describe('edge cases', () => {
        it('handles empty ip and remoteAddress gracefully', () => {
            const middleware = createAuthMiddleware({ apiKey: 'key' });
            const req = createMockReq({ ip: undefined, remoteAddress: undefined });
            // With empty address, isLoopback returns false, so it will check auth
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            // No auth header provided, should get 401
            assert.equal(nextCalled, false);
            assert.equal(res._statusCode, 401);
        });

        it('falls back to socket.remoteAddress when req.ip is falsy', () => {
            const middleware = createAuthMiddleware({});
            const req = createMockReq({ ip: undefined, remoteAddress: '127.0.0.1' });
            // Override ip to be empty so it falls back
            req.ip = '';
            const res = createMockRes();
            let nextCalled = false;

            middleware(req, res, () => { nextCalled = true; });

            // remoteAddress is 127.0.0.1 but req.ip is '' which is falsy.
            // The middleware uses: req.ip || req.socket.remoteAddress || ''
            // '' is falsy so it falls through to socket.remoteAddress = '127.0.0.1'
            assert.equal(nextCalled, true);
        });
    });
});
