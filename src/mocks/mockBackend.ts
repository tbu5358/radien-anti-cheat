import crypto from 'crypto';
import { AxiosRequestConfig } from 'axios';
import {
  AntiCheatEvent,
  ApiResponse,
  CreateCaseRequest,
  CreateCaseResponse,
  GetCaseRequest,
  GetCaseResponse,
  ModerationAction,
  ModerationActionResponse,
  ModerationCase,
  PermissionLevel,
  Permission,
  PERMISSION_LEVEL_PERMISSIONS,
  UserPermissionContext,
  AuditLogEntry,
} from '../types';
import { envConfig } from '../config/environment';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface MockCaseRecord {
  id: string;
  playerId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'CLOSED';
  event: AntiCheatEvent;
  current: ModerationCase;
  history: ModerationCase[];
  autoAssigned: boolean;
  assignedModeratorId?: string;
}

interface MockAuditRecord {
  entry: AuditLogEntry;
}

interface MockModerationAuditRecord {
  id: string;
  caseId: string;
  action: string;
  moderatorId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface MockPermissionRecord {
  context: UserPermissionContext;
}

const DEFAULT_MODERATOR_ID = '999999999999999999';

/**
 * Lightweight in-memory backend used for MOCK_MODE. Provides just enough behavior to allow
 * the Discord bot to operate without a real API. Data is stored in-memory and reset on restart.
 */
export class MockBackend {
  private cases = new Map<string, MockCaseRecord>();
  private audits: MockAuditRecord[] = [];
  private moderationAudits: MockModerationAuditRecord[] = [];
  private permissions = new Map<string, MockPermissionRecord>();
  private antiCheatEvents = new Map<string, AntiCheatEvent>();
  private caseCounter = 1000;

  constructor() {
    console.log('🧪 MOCK_MODE enabled – using in-memory backend');
  }

  reset(): void {
    this.cases.clear();
    this.audits = [];
    this.moderationAudits = [];
    this.permissions.clear();
    this.antiCheatEvents.clear();
    this.caseCounter = 1000;
  }

  getStats() {
    return {
      cases: this.cases.size,
      audits: this.audits.length,
      moderationAudits: this.moderationAudits.length,
    };
  }

  async handleRequest<T>(
    method: HttpMethod,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const cleanedUrl = url.split('?')[0];
    const segments = cleanedUrl.split('/').filter(Boolean);
    const params = (config?.params || {}) as Record<string, any>;

    try {
      if (segments.length === 0) {
        return this.wrapSuccess({}) as T;
      }

      if (segments[0] === 'moderation') {
        return this.handleModeration<T>(method, segments.slice(1), data, params);
      }

      if (segments[0] === 'audit') {
        return this.handleAudit<T>(method, segments.slice(1), data);
      }

      if (segments[0] === 'permissions') {
        return this.handlePermissions<T>(method, segments.slice(1), data, params);
      }

      console.warn(`⚠️ Mock backend received unknown endpoint ${method.toUpperCase()} ${url}`);
      return this.wrapSuccess({}) as T;
    } catch (error) {
      console.error(`❌ Mock backend failed for ${method.toUpperCase()} ${url}:`, error);
      return this.wrapError((error as Error).message || 'Mock backend error') as T;
    }
  }

  private handleModeration<T>(
    method: HttpMethod,
    segments: string[],
    data?: any,
    params?: Record<string, any>
  ): T {
    const resource = segments[0];

    if (resource === 'cases') {
      return this.handleCases<T>(method, segments.slice(1), data, params);
    }

    if (resource === 'action') {
      const caseId = segments[1];
      return this.handleCaseAction<T>(method, caseId, data);
    }

    if (resource === 'anticheat') {
      return this.handleAntiCheat<T>(method, segments.slice(1), data, params);
    }

    if (resource === 'audit') {
      return this.handleModerationAudit<T>(method, segments.slice(1), data, params);
    }

    console.warn(`⚠️ Mock moderation endpoint not implemented: ${segments.join('/')}`);
    return this.wrapSuccess({}) as T;
  }

  private handleCases<T>(
    method: HttpMethod,
    segments: string[],
    body?: any,
    params?: Record<string, any>
  ): T {
    if (segments.length === 0 && method === 'post') {
      return this.createCase(body as CreateCaseRequest) as T;
    }

    if (segments.length === 1) {
      const identifier = segments[0];

      if (identifier === 'search' && method === 'post') {
        return this.searchCases(body) as T;
      }

      if (identifier === 'stats' && method === 'get') {
        return this.getCaseStats() as T;
      }

      if (identifier === 'pending' && method === 'get') {
        return this.getPendingCases(params) as T;
      }

      if (identifier === 'archive' && method === 'post') {
        return this.archiveCases(body) as T;
      }

      // Case ID operations
      const caseId = identifier;
      if (method === 'post') {
        return this.getCase(caseId, body as GetCaseRequest) as T;
      }

      if (method === 'patch') {
        return this.updateCase(caseId, body) as T;
      }
    }

    if (segments.length === 2) {
      const [segmentA, segmentB] = segments;

      if (segmentA === 'player' && method === 'get') {
        return this.getPlayerCases(segmentB, params) as T;
      }

      if (segmentB === 'history' && method === 'get') {
        return this.getCaseHistory(segmentA) as T;
      }

      if (segmentB === 'assign' && method === 'post') {
        return this.assignCase(segmentA, body) as T;
      }
    }

    console.warn(`⚠️ Mock cases endpoint not implemented: ${method} /${segments.join('/')}`);
    return this.wrapSuccess({}) as T;
  }

  private handleCaseAction<T>(
    method: HttpMethod,
    caseId: string,
    body: any
  ): T {
    if (method !== 'post') {
      return this.wrapError(`Unsupported method ${method} for moderation action`) as T;
    }

    return this.takeAction(caseId, body) as T;
  }

  private handleAntiCheat<T>(
    method: HttpMethod,
    segments: string[],
    body?: any,
    params?: Record<string, any>
  ): T {
    if (segments.length === 0 && method === 'post') {
      return this.submitAntiCheatEvent(body) as T;
    }

    if (segments.length === 1 && method === 'get') {
      return this.getAntiCheatEvent(segments[0]) as T;
    }

    if (segments.length === 3 && segments[0] === 'player' && segments[2] === 'stats') {
      return this.getPlayerAntiCheatStats(segments[1]) as T;
    }

    console.warn(`⚠️ Mock anti-cheat endpoint not implemented: ${method} /${segments.join('/')}`);
    return this.wrapSuccess({}) as T;
  }

  private handleModerationAudit<T>(
    method: HttpMethod,
    segments: string[],
    body?: any,
    params?: Record<string, any>
  ): T {
    if (segments.length === 0 && method === 'post') {
      return this.createModerationAudit(body) as T;
    }

    if (segments[0] === 'history' && method === 'get') {
      return this.getModerationAuditHistory(params) as T;
    }

    if (segments[0] === 'stats' && method === 'get') {
      return this.getModerationAuditStats() as T;
    }

    if (segments[0] === 'export' && method === 'post') {
      return this.exportModerationAudits() as T;
    }

    console.warn(`⚠️ Mock moderation audit endpoint not implemented: ${method} /${segments.join('/')}`);
    return this.wrapSuccess({}) as T;
  }

  private handleAudit<T>(
    method: HttpMethod,
    segments: string[],
    body?: any
  ): T {
    const resource = segments[0];

    if (resource === 'log' && method === 'post') {
      this.audits.push({ entry: body });
      return this.wrapSuccess({ logged: true }) as T;
    }

    if (resource === 'query' && method === 'post') {
      return this.wrapSuccess({
        entries: this.audits.map(a => a.entry),
        total: this.audits.length,
        hasMore: false,
      }) as T;
    }

    if (resource === 'stats' && method === 'get') {
      return this.wrapSuccess({
        totalEntries: this.audits.length,
        lastEntry: this.audits[this.audits.length - 1]?.entry || null,
      }) as T;
    }

    console.warn(`⚠️ Mock audit endpoint not implemented: ${method} /${segments.join('/')}`);
    return this.wrapSuccess({}) as T;
  }

  private handlePermissions<T>(
    method: HttpMethod,
    segments: string[],
    body?: any,
    params?: Record<string, any>
  ): T {
    if (segments[0] === 'user' && segments.length === 2 && method === 'get') {
      return this.getUserPermissions(segments[1]) as T;
    }

    if (segments[0] === 'user' && segments[2] === 'grant' && method === 'post') {
      return this.grantPermissions(segments[1], body) as T;
    }

    if (segments[0] === 'user' && segments[2] === 'revoke' && method === 'post') {
      return this.revokePermissions(segments[1], body) as T;
    }

    if (segments[0] === 'users' && method === 'get') {
      return this.getAllPermissions() as T;
    }

    if (segments[0] === 'roles' && method === 'put') {
      return this.wrapSuccess({ updated: true }) as T;
    }

    console.warn(`⚠️ Mock permissions endpoint not implemented: ${method} /${segments.join('/')}`);
    return this.wrapSuccess({}) as T;
  }

  private createCase(request: CreateCaseRequest): ApiResponse<CreateCaseResponse> {
    const caseId = this.generateCaseId();
    const now = new Date().toISOString();
    const playerId = request.event.playerId;
    const initialModerator = DEFAULT_MODERATOR_ID;

    const baseAction: ModerationCase = {
      caseId,
      playerId,
      moderatorId: initialModerator,
      action: 'FLAG',
      reason: `Automatic case creation for ${request.event.gameType}`,
      createdAt: now,
    };

    const record: MockCaseRecord = {
      id: caseId,
      playerId,
      priority: request.priority || 'MEDIUM',
      status: 'OPEN',
      event: request.event,
      current: baseAction,
      history: [baseAction],
      autoAssigned: false,
    };

    this.cases.set(caseId, record);
    this.antiCheatEvents.set(caseId, request.event);

    return this.wrapSuccess({
      case: baseAction,
      autoAssigned: false,
      notifiedChannels: [
        envConfig.channels.antiCheatPings,
        envConfig.channels.moderationLogs,
      ].filter(Boolean),
    });
  }

  private getCase(caseId: string, request?: GetCaseRequest): ApiResponse<GetCaseResponse> {
    const record = this.cases.get(caseId);

    if (!record) {
      return this.wrapError(`Case ${caseId} not found`);
    }

    return this.wrapSuccess({
      case: record.current,
      event: request?.includeEvent !== false ? record.event : undefined,
      history: request?.includeHistory !== false ? record.history : undefined,
      relatedCases: [],
    });
  }

  private getPlayerCases(
    playerId: string,
    params?: Record<string, any>
  ): ApiResponse<{
    cases: ModerationCase[];
    total: number;
    hasMore: boolean;
  }> {
    const cases = Array.from(this.cases.values()).filter(record => record.playerId === playerId);
    return this.wrapSuccess({
      cases: cases.map(record => record.current),
      total: cases.length,
      hasMore: false,
    });
  }

  private updateCase(caseId: string, updates: any): ApiResponse<{ updated: boolean }> {
    const record = this.cases.get(caseId);
    if (!record) {
      return this.wrapError(`Case ${caseId} not found`);
    }

    record.current = {
      ...record.current,
      reason: updates.notes || record.current.reason,
    };

    this.cases.set(caseId, record);

    return this.wrapSuccess({ updated: true });
  }

  private searchCases(filters: Record<string, any>): ApiResponse<{
    cases: ModerationCase[];
    total: number;
    hasMore: boolean;
  }> {
    const allCases = Array.from(this.cases.values());
    const filtered = allCases.filter(record => {
      if (filters.playerId && record.playerId !== filters.playerId) {
        return false;
      }
      if (filters.status && record.status !== filters.status) {
        return false;
      }
      if (filters.priority && record.priority !== filters.priority) {
        return false;
      }
      return true;
    });

    return this.wrapSuccess({
      cases: filtered.map(record => record.current),
      total: filtered.length,
      hasMore: false,
    });
  }

  private getCaseStats(): ApiResponse<{
    totalCases: number;
    openCases: number;
    closedCases: number;
    averageResolutionTime: number;
    casesByPriority: Record<string, number>;
    casesByGameType: Record<string, number>;
    topModerators: Array<{
      moderatorId: string;
      casesHandled: number;
      averageResolutionTime: number;
    }>;
  }> {
    const allCases = Array.from(this.cases.values());
    const openCases = allCases.filter(record => record.status === 'OPEN').length;
    const closedCases = allCases.length - openCases;
    const casesByPriority = allCases.reduce<Record<string, number>>((acc, record) => {
      acc[record.priority] = (acc[record.priority] || 0) + 1;
      return acc;
    }, {});
    const casesByGameType = allCases.reduce<Record<string, number>>((acc, record) => {
      acc[record.event.gameType] = (acc[record.event.gameType] || 0) + 1;
      return acc;
    }, {});

    return this.wrapSuccess({
      totalCases: allCases.length,
      openCases,
      closedCases,
      averageResolutionTime: closedCases > 0 ? 10 * 60 * 1000 : 0,
      casesByPriority,
      casesByGameType,
      topModerators: [
        {
          moderatorId: DEFAULT_MODERATOR_ID,
          casesHandled: allCases.length,
          averageResolutionTime: 10 * 60 * 1000,
        },
      ],
    });
  }

  private archiveCases(body: { olderThanDays: number }): ApiResponse<{
    archivedCount: number;
    totalSizeBytes: number;
  }> {
    const limitDate = Date.now() - body.olderThanDays * 24 * 60 * 60 * 1000;
    let archived = 0;
    this.cases.forEach((record, caseId) => {
      const createdAt = new Date(record.current.createdAt).getTime();
      if (createdAt < limitDate && record.status === 'CLOSED') {
        this.cases.delete(caseId);
        archived += 1;
      }
    });

    return this.wrapSuccess({
      archivedCount: archived,
      totalSizeBytes: archived * 2048,
    });
  }

  private takeAction(caseId: string, request: { action: ModerationAction; moderatorId: string; reason?: string; duration?: number; }): ApiResponse<ModerationActionResponse> {
    const record = this.cases.get(caseId);
    if (!record) {
      return this.wrapError(`Case ${caseId} not found`);
    }

    const actionEntry: ModerationCase = {
      caseId,
      playerId: record.playerId,
      moderatorId: request.moderatorId,
      action: request.action,
      reason: request.reason,
      createdAt: new Date().toISOString(),
    };

    record.history.push(actionEntry);
    record.current = actionEntry;

    if (request.action === 'RESOLVE' || request.action === 'BAN') {
      record.status = 'CLOSED';
    }

    this.cases.set(caseId, record);

    return this.wrapSuccess({
      case: actionEntry,
      caseClosed: record.status === 'CLOSED',
      triggeredActions: [],
    });
  }

  private getCaseHistory(caseId: string): ApiResponse<ModerationCase[]> {
    const record = this.cases.get(caseId);
    if (!record) {
      return this.wrapError(`Case ${caseId} not found`);
    }

    return this.wrapSuccess(record.history);
  }

  private getPendingCases(params?: Record<string, any>): ApiResponse<{
    cases: ModerationCase[];
    total: number;
    urgentCount: number;
  }> {
    const pending = Array.from(this.cases.values()).filter(record => record.status === 'OPEN');
    return this.wrapSuccess({
      cases: pending.map(record => record.current),
      total: pending.length,
      urgentCount: pending.filter(record => record.priority === 'URGENT').length,
    });
  }

  private assignCase(caseId: string, body: { moderatorId: string; assignerId: string }): ApiResponse<{ assigned: boolean }> {
    const record = this.cases.get(caseId);
    if (!record) {
      return this.wrapError(`Case ${caseId} not found`);
    }

    record.assignedModeratorId = body.moderatorId;
    this.cases.set(caseId, record);

    return this.wrapSuccess({ assigned: true });
  }

  private submitAntiCheatEvent(
    event: AntiCheatEvent
  ): ApiResponse<{ eventId: string; caseCreated: boolean }> {
    const eventId = this.generateEventId();
    this.antiCheatEvents.set(eventId, event);

    return this.wrapSuccess({
      eventId,
      caseCreated: true,
    });
  }

  private getAntiCheatEvent(eventId: string): ApiResponse<AntiCheatEvent> {
    const event = this.antiCheatEvents.get(eventId);
    if (!event) {
      return this.wrapError(`Event ${eventId} not found`);
    }
    return this.wrapSuccess(event);
  }

  private getPlayerAntiCheatStats(playerId: string): ApiResponse<{
    totalEvents: number;
    recentEvents: AntiCheatEvent[];
    riskScore: number;
    lastEvent?: AntiCheatEvent;
  }> {
    const events = Array.from(this.antiCheatEvents.values()).filter(event => event.playerId === playerId);

    return this.wrapSuccess({
      totalEvents: events.length,
      recentEvents: events.slice(-5),
      riskScore: Math.min(100, events.length * 10),
      lastEvent: events[events.length - 1],
    });
  }

  private createModerationAudit(body: any): ApiResponse<void> {
    const entry: MockModerationAuditRecord = {
      id: body.id || this.generateAuditId(),
      caseId: body.caseId,
      moderatorId: body.moderatorId,
      action: body.action,
      timestamp: body.timestamp || new Date().toISOString(),
      metadata: body.metadata,
    };

    this.moderationAudits.push(entry);
    return this.wrapSuccess(undefined);
  }

  private getModerationAuditHistory(params?: Record<string, any>): ApiResponse<{
    entries: MockModerationAuditRecord[];
    total: number;
    hasMore: boolean;
  }> {
    const entries = this.moderationAudits.filter(entry => !params?.caseId || entry.caseId === params.caseId);
    return this.wrapSuccess({
      entries,
      total: entries.length,
      hasMore: false,
    });
  }

  private getModerationAuditStats(): ApiResponse<{
    totalActions: number;
    actionsByType: Record<string, number>;
  }> {
    const actionsByType = this.moderationAudits.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {});

    return this.wrapSuccess({
      totalActions: this.moderationAudits.length,
      actionsByType,
    });
  }

  private exportModerationAudits(): ApiResponse<{
    exportId: string;
    downloadUrl: string;
    recordCount: number;
    fileSize: number;
    expiresAt: string;
  }> {
    const exportId = `export-${Date.now()}`;
    return this.wrapSuccess({
      exportId,
      downloadUrl: `https://mock.example.com/${exportId}.json`,
      recordCount: this.moderationAudits.length,
      fileSize: this.moderationAudits.length * 1024,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
  }

  private getUserPermissions(userId: string): ApiResponse<UserPermissionContext> {
    const existing = this.permissions.get(userId);
    if (existing) {
      return this.wrapSuccess(existing.context);
    }

    const context: UserPermissionContext = {
      userId,
      level: PermissionLevel.SENIOR_MODERATOR,
      permissions: PERMISSION_LEVEL_PERMISSIONS[PermissionLevel.SENIOR_MODERATOR],
      isAdmin: false,
      isSeniorModerator: true,
      isModerator: true,
    };

    this.permissions.set(userId, { context });
    return this.wrapSuccess(context);
  }

  private grantPermissions(
    userId: string,
    body: { permissions: Permission[] }
  ): ApiResponse<{ granted: Permission[] }> {
    const context = this.getUserPermissions(userId).data!;
    const updatedPermissions = Array.from(new Set([...context.permissions, ...(body.permissions || [])]));

    const newContext: UserPermissionContext = {
      ...context,
      permissions: updatedPermissions,
    };

    this.permissions.set(userId, { context: newContext });

    return this.wrapSuccess({ granted: body.permissions || [] });
  }

  private revokePermissions(
    userId: string,
    body: { permissions: Permission[] }
  ): ApiResponse<{ revoked: Permission[] }> {
    const context = this.getUserPermissions(userId).data!;
    const revokedSet = new Set(body.permissions || []);
    const updatedPermissions = context.permissions.filter(permission => !revokedSet.has(permission));

    const newContext: UserPermissionContext = {
      ...context,
      permissions: updatedPermissions,
    };

    this.permissions.set(userId, { context: newContext });

    return this.wrapSuccess({ revoked: body.permissions || [] });
  }

  private getAllPermissions(): ApiResponse<{
    users: UserPermissionContext[];
    total: number;
  }> {
    const users = Array.from(this.permissions.values()).map(record => record.context);
    return this.wrapSuccess({
      users,
      total: users.length,
    });
  }

  private wrapSuccess<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: `mock-${Math.random().toString(36).slice(2, 8)}`,
      },
    };
  }

  private wrapError<T>(message: string): ApiResponse<T> {
    return {
      success: false,
      error: message,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: `mock-${Math.random().toString(36).slice(2, 8)}`,
      },
    };
  }

  private generateCaseId(): string {
    this.caseCounter += 1;
    return `CASE-${this.caseCounter}`;
  }

  private generateEventId(): string {
    return `EVENT-${crypto.randomUUID()}`;
  }

  private generateAuditId(): string {
    return `AUDIT-${crypto.randomUUID()}`;
  }
}

export const mockBackend = new MockBackend();

