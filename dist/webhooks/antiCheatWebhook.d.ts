import { Request, Response } from 'express';
/**
 * Security-audited webhook handler for anti-cheat events
 * Implements comprehensive security measures:
 * - HMAC signature verification
 * - Input validation and sanitization
 * - Rate limiting protection
 * - Request size limits
 * - Audit logging
 */
export declare function handleAntiCheatWebhook(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=antiCheatWebhook.d.ts.map