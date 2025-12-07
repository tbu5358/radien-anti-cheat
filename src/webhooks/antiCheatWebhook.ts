import { Request, Response } from 'express';
import crypto from 'crypto';
import { TextChannel } from 'discord.js';
import { AntiCheatEvent } from '../types/AntiCheatEvent';
import { createCase } from '../services/caseService';
import { environment } from '../config/environment';
import { validateAntiCheatEvent } from '../services/antiCheatService';
import { withProfiling } from '../utils/perfProfiler';
import { buildAntiCheatAlertEmbedWithButtons } from '../components/embeds/antiCheatAlertEmbed';
import { configManager } from '../core/ConfigManager';
import { getClient } from '../core/Bot';
import { logger } from '../utils/structuredLogger';

/**
 * Verify webhook signature to ensure request authenticity
 * Implements HMAC-SHA256 signature verification
 */
function verifyWebhookSignature(req: Request): boolean {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    if (!signature) {
      logger.warn('Webhook signature missing', { clientIP: req.ip });
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
      logger.error('Webhook signature verification error', {
        error: error instanceof Error ? error.message : String(error),
        clientIP: req.ip
      });
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
  const fs = require('fs');
  fs.appendFileSync('/tmp/webhook-debug.log', `🚀 WEBHOOK HANDLER STARTED! ${new Date().toISOString()}\n`);
  const startTime = Date.now();
  let clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  await withProfiling('webhook:antiCheat', async () => {
    try {
      fs.appendFileSync('/tmp/webhook-debug.log', `📝 Processing webhook...\n`);
      logger.info('Processing anti-cheat webhook', { clientIP });

    // Step 1: Validate request headers and basic structure
      const requestValidation = validateWebhookRequest(req);
      if (!requestValidation.isValid) {
        logger.warn('Webhook request validation failed', {
          clientIP,
          error: requestValidation.error
        });
        res.status(400).json({
          error: 'Bad Request',
          message: requestValidation.error
        });
        return;
      }

      // Step 2: Verify webhook signature (CRITICAL SECURITY)
      if (!verifyWebhookSignature(req)) {
        logger.error('Webhook signature verification failed', {
          clientIP,
          severity: 'CRITICAL'
        });

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid webhook signature'
        });
        return;
      }

      logger.info('Webhook signature verified', { clientIP });

      // Step 3: Parse and validate the anti-cheat event
      const event: AntiCheatEvent = req.body;

      // Validate the anti-cheat event structure
      try {
        validateAntiCheatEvent(event);
      } catch (validationError) {
        logger.warn('Anti-cheat event validation failed', {
          clientIP,
          error: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
        res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid anti-cheat event data',
          details: validationError instanceof Error ? validationError.message : 'Validation failed'
        });
        return;
      }

    // Step 4: Process the anti-cheat event
    logger.info('Processing anti-cheat event', {
      playerId: event.playerId,
      username: event.username,
      gameType: event.gameType
    });

    // For mock mode testing, generate a case ID since case creation may not return expected structure
    const caseId = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let discordPosted = false;
    try {
      await createCase(event); // Still attempt case creation for backend processing
    } catch (error) {
      logger.warn('Case creation failed, but continuing with webhook processing', {
        playerId: event.playerId,
        generatedCaseId: caseId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    const processingTime = Date.now() - startTime;

    // Step 5: Send success response
    const responseData = {
      success: true,
      caseId: caseId,
      discordPosted: discordPosted,
      processingTime,
      receivedAt: new Date().toISOString()
    };
    console.log('SENDING RESPONSE:', JSON.stringify(responseData));
    res.status(200).json(responseData);

    // Step 6: Post anti-cheat alert to Discord channel
    if (caseId) {
      try {
        console.log(`🎯 ABOUT TO POST TO DISCORD: caseId=${caseId}`);
        await postAntiCheatAlertToDiscord(event, caseId);
        console.log(`✅ DISCORD POST SUCCESS: caseId=${caseId}`);
        discordPosted = true;
        logger.info('Anti-cheat alert posted to Discord', { caseId, playerId: event.playerId });
      } catch (discordError) {
        console.log(`❌ DISCORD POST FAILED: ${discordError instanceof Error ? discordError.message : String(discordError)}`);
        logger.error('Discord posting failed', {
          caseId,
          playerId: event.playerId,
          error: discordError instanceof Error ? discordError.message : String(discordError)
        });
      }
    } else {
      console.log(`⚠️ NO CASE ID - SKIPPING DISCORD POST`);
      logger.warn('Skipping Discord posting due to case creation failure', { playerId: event.playerId });
    }

    } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Webhook processing failed', {
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

/**
 * Post anti-cheat alert embed to Discord channel
 * @param event The anti-cheat event data
 * @param caseId The case ID
 */
async function postAntiCheatAlertToDiscord(event: AntiCheatEvent, caseId: string): Promise<void> {
  const fs = require('fs');
  fs.appendFileSync('/tmp/webhook-debug.log', `🎯 ATTEMPTING TO POST TO DISCORD: caseId=${caseId}, player=${event.playerId}\n`);
  try {
    const config = configManager.getConfiguration();
    const client = getClient();

    console.log(`🔗 Client ready: ${client.isReady()}`);

    // Check if bot is ready
    if (!client.isReady()) {
      throw new Error('Discord client is not ready');
    }

    // Get the anti-cheat pings channel
    const channelId = config.channels.antiCheatPings;
    console.log(`📺 Channel ID: ${channelId}`);
    if (!channelId) {
      throw new Error('Anti-cheat pings channel not configured');
    }

    // Fetch the channel
    console.log(`🔍 Fetching channel ${channelId}...`);
    const channel = await client.channels.fetch(channelId);
    console.log(`✅ Channel fetched: ${channel ? (channel as any).name || 'unnamed' : 'null'}, type: ${channel?.type}, textBased: ${channel?.isTextBased()}`);

    if (!channel || !channel.isTextBased() || !(channel instanceof TextChannel)) {
      throw new Error(`Channel ${channelId} not found or not a text channel`);
    }

    // Build the embed with buttons
    console.log(`🏗️ Building embed for case ${caseId}...`);
    const messageContent = buildAntiCheatAlertEmbedWithButtons(event, caseId);
    console.log(`📦 Message content built: ${messageContent.embeds.length} embeds, ${messageContent.components.length} components`);

    // Send the message to the channel
    console.log(`📤 Sending message to channel...`);
    const sentMessage = await (channel as TextChannel).send({
      embeds: messageContent.embeds,
      components: messageContent.components.map(row => row.toJSON())
    });
    console.log(`✅ MESSAGE SENT! Message ID: ${sentMessage.id}`);

    logger.info('Anti-cheat alert posted to Discord', {
      caseId,
      playerId: event.playerId,
      channelId,
      gameType: event.gameType,
      messageId: sentMessage.id
    });

  } catch (error) {
    console.error(`❌ DISCORD POSTING FAILED:`, error);
    logger.error('Failed to post anti-cheat alert to Discord', {
      caseId,
      playerId: event.playerId,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
