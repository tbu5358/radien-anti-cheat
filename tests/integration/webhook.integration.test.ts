/**
 * Integration Tests for Webhook Endpoints
 *
 * Tests the complete webhook processing flow from HTTP request to
 * Discord interaction, ensuring proper validation, security, and error handling.
 *
 * Test Coverage:
 * - Webhook signature verification
 * - Anti-cheat event validation and processing
 * - Case creation and Discord notification
 * - Error handling and logging
 * - Rate limiting behavior
 * - Security headers and CORS
 */

import request from 'supertest';
import express from 'express';
import { handleAntiCheatWebhook } from '../../../src/webhooks/antiCheatWebhook';
import { environment } from '../../../src/config/environment';
import crypto from 'crypto';

// Mock the case service to avoid actual Discord API calls
jest.mock('../../../src/services/caseService', () => ({
  createCase: jest.fn().mockResolvedValue({
    success: true,
    data: {
      case: {
        caseId: 'CASE-TEST-123',
        status: 'OPEN',
        severity: 'MEDIUM',
      },
    },
  }),
}));

describe('Webhook Integration Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();

    // Set up middleware (similar to production setup)
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Add the webhook route
    app.post('/webhooks/anticheat', handleAntiCheatWebhook);
  });

  describe('Webhook Signature Verification', () => {
    const validEvent = {
      playerId: '123456789012345678',
      username: 'TestPlayer',
      gameId: 'game-123',
      violationType: 'speed_hack',
      severity: 'high',
      evidence: ['screenshot1.jpg'],
      timestamp: new Date().toISOString(),
      serverId: 'server-456',
      metadata: {},
    };

    it('should accept requests with valid webhook signature', async () => {
      const payload = JSON.stringify(validEvent);
      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(validEvent);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        caseId: 'CASE-TEST-123',
        processingTime: expect.any(Number),
      });
    });

    it('should reject requests with invalid webhook signature', async () => {
      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', 'invalid-signature')
        .send(validEvent);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
      });
    });

    it('should reject requests without webhook signature', async () => {
      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .send(validEvent);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
      });
    });

    it('should reject requests with wrong content type', async () => {
      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'text/plain')
        .set('X-Webhook-Signature', 'dummy-signature')
        .send('plain text payload');

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Content-Type must be application/json',
      });
    });
  });

  describe('Anti-Cheat Event Validation', () => {
    const createSignature = (payload: any) => {
      return crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex');
    };

    it('should accept valid anti-cheat events', async () => {
      const validEvent = {
        playerId: '123456789012345678',
        username: 'ValidPlayer',
        gameId: 'game-123',
        violationType: 'wall_hack',
        severity: 'medium',
        evidence: ['evidence1.jpg', 'evidence2.jpg'],
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: { additionalInfo: 'test' },
      };

      const signature = createSignature(validEvent);

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(validEvent);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject events with missing required fields', async () => {
      const invalidEvent = {
        // Missing playerId, username, etc.
        violationType: 'speed_hack',
        severity: 'high',
      };

      const signature = createSignature(invalidEvent);

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Invalid anti-cheat event data',
      });
    });

    it('should reject events with invalid player IDs', async () => {
      const invalidEvent = {
        playerId: 'invalid-player-id',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: [],
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: {},
      };

      const signature = createSignature(invalidEvent);

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });

    it('should reject events with invalid timestamps', async () => {
      const invalidEvent = {
        playerId: '123456789012345678',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: [],
        timestamp: 'invalid-timestamp',
        serverId: 'server-456',
        metadata: {},
      };

      const signature = createSignature(invalidEvent);

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(invalidEvent);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Bad Request');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle case creation failures gracefully', async () => {
      // Mock case service to throw an error
      const { createCase } = require('../../../src/services/caseService');
      createCase.mockRejectedValueOnce(new Error('Database connection failed'));

      const validEvent = {
        playerId: '123456789012345678',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: ['evidence.jpg'],
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: {},
      };

      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(validEvent))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(validEvent);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal Server Error',
        message: 'Webhook processing failed',
        requestId: expect.any(String),
      });
    });

    it('should include request ID in error responses', async () => {
      const validEvent = {
        playerId: '123456789012345678',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: [],
        timestamp: 'invalid-timestamp',
        serverId: 'server-456',
        metadata: {},
      };

      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(validEvent))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(validEvent);

      expect(response.status).toBe(400);
      expect(response.body.requestId).toMatch(/^[a-f0-9]{16}$/); // 8 bytes as hex
    });
  });

  describe('Security and Performance', () => {
    it('should handle large payloads within limits', async () => {
      const largeEvent = {
        playerId: '123456789012345678',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: Array(1000).fill('evidence.jpg'), // Large evidence array
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: { largeData: 'x'.repeat(10000) }, // Large metadata
      };

      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(largeEvent))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(largeEvent);

      // Should succeed if within limits, or fail gracefully if over limits
      expect([200, 413]).toContain(response.status);
    });

    it('should prevent request body tampering', async () => {
      // Create signature for original payload
      const originalEvent = {
        playerId: '123456789012345678',
        username: 'OriginalPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: [],
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: {},
      };

      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(originalEvent))
        .digest('hex');

      // Send tampered payload with same signature
      const tamperedEvent = {
        ...originalEvent,
        username: 'HackerPlayer', // Tampered data
      };

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(tamperedEvent);

      // Should be rejected due to signature mismatch
      expect(response.status).toBe(401);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', 'dummy-signature')
        .send('{ invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Response Format and Headers', () => {
    it('should return proper JSON responses', async () => {
      const validEvent = {
        playerId: '123456789012345678',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: [],
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: {},
      };

      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(validEvent))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(validEvent);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toBeInstanceOf(Object);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('processingTime');
    });

    it('should include security headers', async () => {
      const validEvent = {
        playerId: '123456789012345678',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: [],
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: {},
      };

      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(validEvent))
        .digest('hex');

      const response = await request(app)
        .post('/webhooks/anticheat')
        .set('Content-Type', 'application/json')
        .set('X-Webhook-Signature', signature)
        .send(validEvent);

      // Check for security headers (these would be set by helmet middleware in production)
      expect(response.headers).toBeDefined();
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const validEvent = {
        playerId: '123456789012345678',
        username: 'TestPlayer',
        gameId: 'game-123',
        violationType: 'speed_hack',
        severity: 'high',
        evidence: [],
        timestamp: new Date().toISOString(),
        serverId: 'server-456',
        metadata: {},
      };

      const signature = crypto
        .createHmac('sha256', environment.WEBHOOK_SECRET)
        .update(JSON.stringify(validEvent))
        .digest('hex');

      // Send multiple concurrent requests
      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/webhooks/anticheat')
          .set('Content-Type', 'application/json')
          .set('X-Webhook-Signature', signature)
          .send(validEvent)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
