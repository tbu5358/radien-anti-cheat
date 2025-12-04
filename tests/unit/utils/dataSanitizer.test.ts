/**
 * Unit Tests for Data Sanitizer Utility
 *
 * Tests the data sanitization functions that protect sensitive information
 * from being exposed in logs, audit trails, and error messages.
 *
 * Test Coverage:
 * - String sanitization (API keys, tokens, passwords)
 * - Selective sanitization (preserving moderation data)
 * - Object sanitization with nested structures
 * - Discord ID sanitization (user IDs, channel IDs, guild IDs)
 * - Email and IP address sanitization
 * - URL sanitization
 * - Audit metadata sanitization
 */

import {
  sanitizeUserId,
  sanitizeChannelId,
  sanitizeGuildId,
  sanitizeEmail,
  sanitizeIpAddress,
  sanitizeUrl,
  sanitizeString,
  sanitizeStringSelective,
  sanitizeObject,
  sanitizeAuditMetadata,
  updateSanitizationConfig,
  getSanitizationConfig,
} from '../../../src/utils/dataSanitizer';

describe('Data Sanitizer Utility', () => {
  beforeEach(() => {
    // Reset to default configuration before each test
    updateSanitizationConfig({
      enabled: true,
      preservePartialIds: true,
      forbiddenFields: ['password', 'token', 'secret', 'key', 'api_key', 'apiKey'],
      customRules: new Map(),
    });
  });

  describe('Discord ID Sanitization', () => {
    describe('sanitizeUserId', () => {
      it('should sanitize user IDs when enabled', () => {
        const result = sanitizeUserId('123456789012345678');
        expect(result).toBe('12***78');
      });

      it('should not sanitize short IDs', () => {
        const result = sanitizeUserId('123');
        expect(result).toBe('123');
      });

      it('should return original ID when sanitization is disabled', () => {
        updateSanitizationConfig({ enabled: false });
        const result = sanitizeUserId('123456789012345678');
        expect(result).toBe('123456789012345678');
      });

      it('should not preserve partial IDs when configured', () => {
        updateSanitizationConfig({ preservePartialIds: false });
        const result = sanitizeUserId('123456789012345678');
        expect(result).toBe('[REDACTED_USER_ID]');
      });
    });

    describe('sanitizeChannelId', () => {
      it('should sanitize channel IDs', () => {
        const result = sanitizeChannelId('987654321098765432');
        expect(result).toBe('98***32');
      });
    });

    describe('sanitizeGuildId', () => {
      it('should sanitize guild IDs', () => {
        const result = sanitizeGuildId('555666777888999000');
        expect(result).toBe('55***00');
      });
    });
  });

  describe('Sensitive Data Sanitization', () => {
    describe('sanitizeEmail', () => {
      it('should sanitize email addresses', () => {
        const result = sanitizeEmail('user@example.com');
        expect(result).toBe('us***@example.com'); // First 2 chars + *** + domain
      });

      it('should handle short local parts', () => {
        const result = sanitizeEmail('a@test.com');
        expect(result).toBe('a***@test.com');
      });
    });

    describe('sanitizeIpAddress', () => {
      it('should sanitize IPv4 addresses', () => {
        const result = sanitizeIpAddress('192.168.1.100');
        expect(result).toBe('192.168.1.***');
      });

      it('should return non-IP strings unchanged', () => {
        const result = sanitizeIpAddress('not-an-ip');
        expect(result).toBe('not-an-ip');
      });
    });

    describe('sanitizeUrl', () => {
      it('should sanitize URLs with sensitive parameters', () => {
        const result = sanitizeUrl('https://api.example.com/data?api_key=secret123&user_id=123');
        expect(result).toBe('https://api.example.com/data?api_key=%5BREDACTED%5D&user_id=123');
      });

      it('should handle invalid URLs gracefully', () => {
        const result = sanitizeUrl('not-a-url');
        expect(result).toBe('not-a-url');
      });
    });
  });

  describe('String Sanitization', () => {
    describe('sanitizeString', () => {
      it('should sanitize API keys in strings', () => {
        const result = sanitizeString('The API key is abc123def456ghi789jkl012345678901234567890');
        expect(result).toBe('The API key is [REDACTED]');
      });

      it('should sanitize Bearer tokens', () => {
        const result = sanitizeString('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        expect(result).toBe('Authorization: Bearer [REDACTED]');
      });

      it('should sanitize Discord tokens', () => {
        const result = sanitizeString('Token: NDU3MzQ1MzQ4MzQ3MzQ1.MTUwMzQ.NDU3MzQ1MzQ4MzQ3MzQ1');
        expect(result).toBe('Token: [REDACTED]');
      });
    });

    describe('sanitizeStringSelective', () => {
      it('should only sanitize critical sensitive data', () => {
        const input = 'User ID: 123456789, API Key: abc123def456, Channel: 987654321';
        const result = sanitizeStringSelective(input);
        expect(result).toBe('User ID: 123456789, API [REDACTED] Channel: 987654321');
      });

      it('should preserve user IDs and channel IDs', () => {
        const input = 'User 123456789012345678 reported in channel 987654321098765432';
        const result = sanitizeStringSelective(input);
        expect(result).toBe(input); // Should be unchanged
      });
    });
  });

  describe('Object Sanitization', () => {
    describe('sanitizeObject', () => {
      it('should sanitize forbidden fields in objects', () => {
        const obj = {
          userId: '123456789012345678',
          apiKey: 'secret123',
          password: 'mypassword',
          normalField: 'normal value',
        };

        const result = sanitizeObject(obj);

        expect(result.userId).toBe('123456789012345678'); // NOT sanitized (moderation-critical)
        expect(result.apiKey).toBe('[REDACTED_FORBIDDEN_FIELD]');
        expect(result.password).toBe('[REDACTED_FORBIDDEN_FIELD]');
        expect(result.normalField).toBe('normal value'); // Unchanged
      });

      it('should handle nested objects', () => {
        const obj = {
          user: {
            id: '123456789012345678',
            email: 'user@example.com',
          },
          metadata: {
            apiKey: 'secret123',
            channelId: '987654321098765432',
          },
        };

        const result = sanitizeObject(obj);

        expect(result.user.id).toBe('123456789012345678'); // NOT sanitized
        expect(result.user.email).toBe('[REDACTED]'); // Sanitized
        expect(result.metadata.apiKey).toBe('[REDACTED_FORBIDDEN_FIELD]'); // Sanitized
        expect(result.metadata.channelId).toBe('98***32'); // Sanitized (channel ID)
      });

      it('should handle arrays', () => {
        const obj = {
          users: ['123456789012345678', '987654321098765432'],
          tokens: ['token1', 'token2'],
        };

        const result = sanitizeObject(obj);

        expect(result.users[0]).toBe('123456789012345678'); // NOT sanitized
        expect(result.users[1]).toBe('987654321098765432'); // NOT sanitized
        expect(result.tokens[0]).toBe('token1'); // NOT sanitized (not in forbidden format)
        expect(result.tokens[1]).toBe('token2'); // NOT sanitized (not in forbidden format)
      });

      it('should respect depth limits', () => {
        const deepObj = {
          level1: {
            level2: {
              level3: {
                level4: {
                  sensitive: 'secret',
                },
              },
            },
          },
        };

        const result = sanitizeObject(deepObj, 2); // Max depth 2
        expect(result.level1.level2).toBe('[MAX_DEPTH_REACHED]');
      });
    });

    describe('sanitizeAuditMetadata', () => {
      it('should sanitize audit metadata selectively', () => {
        const metadata = {
          userId: '123456789012345678',
          targetId: '987654321098765432',
          channelId: '555666777888999000',
          guildId: '111222333444555666',
          email: 'user@example.com',
          apiKey: 'secret123',
          caseId: 'CASE-12345',
          reason: 'Violation detected',
        };

        const result = sanitizeAuditMetadata(metadata);

        // Moderation-critical data preserved
        expect(result.userId).toBe('123456789012345678'); // NOT sanitized
        expect(result.targetId).toBe('987654321098765432'); // NOT sanitized
        expect(result.caseId).toBe('CASE-12345'); // NOT sanitized
        expect(result.reason).toBe('Violation detected'); // NOT sanitized

        // Security-sensitive data sanitized
        expect(result.channelId).toBe('55***00'); // Sanitized
        expect(result.guildId).toBe('11***66'); // Sanitized
        expect(result.email).toBe('us***@example.com'); // Sanitized
        expect(result.apiKey).toBe('[REDACTED]'); // Sanitized
      });
    });
  });

  describe('Configuration Management', () => {
    describe('updateSanitizationConfig', () => {
      it('should update configuration', () => {
        updateSanitizationConfig({ enabled: false });
        expect(getSanitizationConfig().enabled).toBe(false);
      });

      it('should merge configuration with defaults', () => {
        updateSanitizationConfig({ preservePartialIds: false });
        const config = getSanitizationConfig();
        expect(config.preservePartialIds).toBe(false);
        expect(config.enabled).toBe(true); // Default preserved
      });
    });

    describe('getSanitizationConfig', () => {
      it('should return current configuration', () => {
        const config = getSanitizationConfig();
        expect(config).toHaveProperty('enabled');
        expect(config).toHaveProperty('preservePartialIds');
        expect(config).toHaveProperty('forbiddenFields');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should handle primitive values', () => {
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(123)).toBe(123);
      expect(sanitizeObject(true)).toBe(true);
    });

    it('should handle empty objects and arrays', () => {
      expect(sanitizeObject({})).toEqual({});
      expect(sanitizeObject([])).toEqual([]);
    });

      it('should handle circular references safely', () => {
        const obj: any = { name: 'test' };
        obj.self = obj;

        const result = sanitizeObject(obj);
        expect(result.name).toBe('test');
        expect(result.self).toBe('[CIRCULAR_REFERENCE]');
      });
  });
});
