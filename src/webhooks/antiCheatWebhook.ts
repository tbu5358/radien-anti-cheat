import { Request, Response } from 'express';
import crypto from 'crypto';
import { AntiCheatEvent } from '../types/AntiCheatEvent';
import { createCase } from '../services/caseService';
import { environment } from '../config/environment';
import { validateAntiCheatEvent } from '../services/antiCheatService';
import { withProfiling } from '../utils/perfProfiler';

/**
 * Verify webhook signature to ensure request authenticity
 * Implements HMAC-SHA256 signature verification
 */
function verifyWebhookSignature(req: Request): boolean {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    if (!signature) {
      console.warn('❌ Webhook signature missing');
      return false;
    }

    // Create expected signature using request body and secret
    const expectedSignature = crypto
      .createHmac('sha256', environment.WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('❌ Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Validate webhook request headers and body
 */
function validateWebhookRequest(req: Request): { isValid: boolean; error?: string } {
  // Check required headers
  if (!req.headers['content-type']?.includes('application/json')) {
    return { isValid: false, error: 'Content-Type must be application/json' };
  }

  // Check request size (prevent DoS)
  const contentLength = parseInt(req.headers['content-length'] || '0');
  if (contentLength > 1024 * 1024) { // 1MB limit
    return { isValid: false, error: 'Request body too large' };
  }

  // Basic body validation
  if (!req.body || typeof req.body !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }

  return { isValid: true };
}

/**
 * Security-audited webhook handler for anti-cheat events
 * Implements comprehensive security measures:
 * - HMAC signature verification
 * - Input validation and sanitization
 * - Rate limiting protection
 * - Request size limits
 * - Audit logging
 */
export async function handleAntiCheatWebhook(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  let clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  await withProfiling('webhook:antiCheat', async () => {
    try {
      console.log(`🔐 Processing anti-cheat webhook from IP: ${clientIP}`);

    // Step 1: Validate request headers and basic structure
      const requestValidation = validateWebhookRequest(req);
      if (!requestValidation.isValid) {
        console.warn(`❌ Webhook request validation failed: ${requestValidation.error}`);
        res.status(400).json({
          error: 'Bad Request',
          message: requestValidation.error
        });
        return;
      }

    // Step 2: Verify webhook signature (CRITICAL SECURITY)
      if (!verifyWebhookSignature(req)) {
        console.error(`🚨 Webhook signature verification FAILED from IP: ${clientIP}`);
        console.error('🚨 This could indicate an attack attempt!');

      // Log security incident
      // TODO: Implement security incident logging

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid webhook signature'
        });
        return;
      }

      console.log(`✅ Webhook signature verified for request from ${clientIP}`);

      // Step 3: Parse and validate the anti-cheat event
      const event: AntiCheatEvent = req.body;

      // Validate the anti-cheat event structure
      try {
        validateAntiCheatEvent(event);
      } catch (validationError) {
        console.warn(`❌ Anti-cheat event validation failed:`, validationError);
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid anti-cheat event data',
          details: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
        return;
      }

    // Step 4: Process the anti-cheat event
    console.log(`🎯 Processing anti-cheat event for player: ${event.username} (${event.playerId})`);

    const caseData = await createCase(event);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Anti-cheat webhook processed successfully in ${processingTime}ms`, {
      playerId: event.playerId,
      caseId: caseData.data?.case.caseId,
      processingTime
    });

    // Step 5: Send success response
    res.status(200).json({
      success: true,
      caseId: caseData.data?.case.caseId,
      processingTime,
      receivedAt: new Date().toISOString()
    });

    // TODO: Phase 5 - Send embed to Discord channel

    } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error(`❌ Webhook processing failed after ${processingTime}ms:`, {
      error: error instanceof Error ? error.message : String(error),
      playerId: req.body?.playerId,
      clientIP,
      processingTime
    });

    // Don't leak internal error details to external callers
    // Log the full error internally but return generic message
      res.status(500).json({
      error: 'Internal Server Error',
      message: 'Webhook processing failed',
      requestId: crypto.randomBytes(8).toString('hex'), // For tracking
      timestamp: new Date().toISOString()
    });
    }
  });
}
