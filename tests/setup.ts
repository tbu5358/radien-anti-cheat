/**
 * Jest Test Setup for Raiden Anti-Cheat Moderation Bot
 *
 * Global test configuration and setup that runs before all test suites.
 * Configures mocking, environment variables, and test utilities.
 */

// Extend global type for test utilities
declare global {
  var testUtils: {
    createMockInteraction: (overrides?: any) => any;
    createMockAntiCheatEvent: (overrides?: any) => any;
    createMockApiResponse: (data: any, success?: boolean) => any;
    wait: (ms: number) => Promise<void>;
    cleanup: () => void;
  };
}

// Load environment variables for testing
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'ERROR'; // Reduce log noise during tests

// Mock Discord.js to avoid real API calls
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue('mock-token'),
    destroy: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    user: {
      id: '123456789012345678',
      username: 'TestBot',
      tag: 'TestBot#1234',
      setPresence: jest.fn().mockResolvedValue(undefined),
    },
    guilds: {
      cache: new Map([
        ['guild-1', { id: 'guild-1', name: 'Test Guild' }],
      ]),
    },
    users: {
      cache: new Map([
        ['user-1', { id: 'user-1', username: 'TestUser' }],
      ]),
    },
    ws: {
      ping: 50,
      status: 0, // READY
    },
    uptime: 3600000, // 1 hour
    readyAt: new Date(),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
  },
  ActivityType: {
    Watching: 3,
  },
  Routes: {
    applicationCommands: jest.fn(),
    applicationGuildCommands: jest.fn(),
  },
  REST: jest.fn().mockImplementation(() => ({
    setToken: jest.fn().mockReturnThis(),
    put: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock axios for API testing
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    request: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
  defaults: {},
}));

// Mock crypto for security testing
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-signature'),
  })),
  timingSafeEqual: jest.fn().mockReturnValue(true),
  randomBytes: jest.fn().mockReturnValue(Buffer.from('mock-random-bytes')),
}));

// Mock fs for file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue('mock-file-content'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

// Extend global type for test utilities
declare global {
  var testUtils: {
    createMockInteraction: (overrides?: any) => any;
    createMockAntiCheatEvent: (overrides?: any) => any;
    createMockApiResponse: (data: any, success?: boolean) => any;
    wait: (ms: number) => Promise<void>;
    cleanup: () => void;
  };
}

// Global test utilities
global.testUtils = {
  // Create mock Discord interaction
  createMockInteraction: (overrides = {}) => ({
    id: 'interaction-123',
    user: {
      id: 'user-123',
      username: 'TestUser',
      tag: 'TestUser#1234',
    },
    guildId: 'guild-123',
    channelId: 'channel-123',
    replied: false,
    deferred: false,
    reply: jest.fn().mockResolvedValue(undefined),
    editReply: jest.fn().mockResolvedValue(undefined),
    followUp: jest.fn().mockResolvedValue(undefined),
    deferReply: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }),

  // Create mock anti-cheat event
  createMockAntiCheatEvent: (overrides = {}) => ({
    playerId: 'player-123',
    username: 'TestPlayer',
    gameId: 'game-456',
    violationType: 'speed_hack',
    severity: 'high',
    evidence: ['screenshot-1.jpg', 'log-1.txt'],
    timestamp: new Date().toISOString(),
    serverId: 'server-789',
    metadata: {},
    ...overrides,
  }),

  // Create mock API response
  createMockApiResponse: (data: any, success = true) => ({
    data: success ? { success: true, data } : { success: false, error: data },
    status: success ? 200 : 400,
    statusText: success ? 'OK' : 'Bad Request',
    headers: {},
    config: {},
  }),

  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Clean up after tests
  cleanup: () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  },
};

// Custom Jest matchers
expect.extend({
  // Custom matcher for API response validation
  toBeValidApiResponse(received) {
    const pass = received &&
                 typeof received === 'object' &&
                 'success' in received &&
                 'data' in received;

    return {
      message: () => `Expected ${received} to be a valid API response`,
      pass,
    };
  },

  // Custom matcher for Discord interaction validation
  toBeValidDiscordInteraction(received) {
    const pass = received &&
                 typeof received === 'object' &&
                 'id' in received &&
                 'user' in received &&
                 'reply' in received;

    return {
      message: () => `Expected ${received} to be a valid Discord interaction`,
      pass,
    };
  },
});

// Console spy to suppress logs during tests unless explicitly needed
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  // Restore console after all tests
  Object.assign(console, originalConsole);
});

// Global beforeEach cleanup
beforeEach(() => {
  jest.clearAllMocks();
});

// Global afterEach cleanup
afterEach(() => {
  global.testUtils.cleanup();
});
