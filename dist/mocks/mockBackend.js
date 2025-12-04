"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockBackend = exports.MockBackend = void 0;
const crypto_1 = __importDefault(require("crypto"));
const types_1 = require("../types");
const environment_1 = require("../config/environment");
const DEFAULT_MODERATOR_ID = '999999999999999999';
/**
 * Lightweight in-memory backend used for MOCK_MODE. Provides just enough behavior to allow
 * the Discord bot to operate without a real API. Data is stored in-memory and reset on restart.
 */
class MockBackend {
    constructor() {
        this.cases = new Map();
        this.audits = [];
        this.moderationAudits = [];
        this.permissions = new Map();
        this.antiCheatEvents = new Map();
        this.caseCounter = 1000;
        console.log('🧪 MOCK_MODE enabled – using in-memory backend');
    }
    reset() {
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
    async handleRequest(method, url, data, config) {
        const cleanedUrl = url.split('?')[0];
        const segments = cleanedUrl.split('/').filter(Boolean);
        const params = (config?.params || {});
        try {
            if (segments.length === 0) {
                return this.wrapSuccess({});
            }
            if (segments[0] === 'moderation') {
                return this.handleModeration(method, segments.slice(1), data, params);
            }
            if (segments[0] === 'audit') {
                return this.handleAudit(method, segments.slice(1), data);
            }
            if (segments[0] === 'permissions') {
                return this.handlePermissions(method, segments.slice(1), data, params);
            }
            console.warn(`⚠️ Mock backend received unknown endpoint ${method.toUpperCase()} ${url}`);
            return this.wrapSuccess({});
        }
        catch (error) {
            console.error(`❌ Mock backend failed for ${method.toUpperCase()} ${url}:`, error);
            return this.wrapError(error.message || 'Mock backend error');
        }
    }
    handleModeration(method, segments, data, params) {
        const resource = segments[0];
        if (resource === 'cases') {
            return this.handleCases(method, segments.slice(1), data, params);
        }
        if (resource === 'action') {
            const caseId = segments[1];
            return this.handleCaseAction(method, caseId, data);
        }
        if (resource === 'anticheat') {
            return this.handleAntiCheat(method, segments.slice(1), data, params);
        }
        if (resource === 'audit') {
            return this.handleModerationAudit(method, segments.slice(1), data, params);
        }
        console.warn(`⚠️ Mock moderation endpoint not implemented: ${segments.join('/')}`);
        return this.wrapSuccess({});
    }
    handleCases(method, segments, body, params) {
        if (segments.length === 0 && method === 'post') {
            return this.createCase(body);
        }
        if (segments.length === 1) {
            const identifier = segments[0];
            if (identifier === 'search' && method === 'post') {
                return this.searchCases(body);
            }
            if (identifier === 'stats' && method === 'get') {
                return this.getCaseStats();
            }
            if (identifier === 'pending' && method === 'get') {
                return this.getPendingCases(params);
            }
            if (identifier === 'archive' && method === 'post') {
                return this.archiveCases(body);
            }
            // Case ID operations
            const caseId = identifier;
            if (method === 'post') {
                return this.getCase(caseId, body);
            }
            if (method === 'patch') {
                return this.updateCase(caseId, body);
            }
        }
        if (segments.length === 2) {
            const [segmentA, segmentB] = segments;
            if (segmentA === 'player' && method === 'get') {
                return this.getPlayerCases(segmentB, params);
            }
            if (segmentB === 'history' && method === 'get') {
                return this.getCaseHistory(segmentA);
            }
            if (segmentB === 'assign' && method === 'post') {
                return this.assignCase(segmentA, body);
            }
        }
        console.warn(`⚠️ Mock cases endpoint not implemented: ${method} /${segments.join('/')}`);
        return this.wrapSuccess({});
    }
    handleCaseAction(method, caseId, body) {
        if (method !== 'post') {
            return this.wrapError(`Unsupported method ${method} for moderation action`);
        }
        return this.takeAction(caseId, body);
    }
    handleAntiCheat(method, segments, body, params) {
        if (segments.length === 0 && method === 'post') {
            return this.submitAntiCheatEvent(body);
        }
        if (segments.length === 1 && method === 'get') {
            return this.getAntiCheatEvent(segments[0]);
        }
        if (segments.length === 3 && segments[0] === 'player' && segments[2] === 'stats') {
            return this.getPlayerAntiCheatStats(segments[1]);
        }
        console.warn(`⚠️ Mock anti-cheat endpoint not implemented: ${method} /${segments.join('/')}`);
        return this.wrapSuccess({});
    }
    handleModerationAudit(method, segments, body, params) {
        if (segments.length === 0 && method === 'post') {
            return this.createModerationAudit(body);
        }
        if (segments[0] === 'history' && method === 'get') {
            return this.getModerationAuditHistory(params);
        }
        if (segments[0] === 'stats' && method === 'get') {
            return this.getModerationAuditStats();
        }
        if (segments[0] === 'export' && method === 'post') {
            return this.exportModerationAudits();
        }
        console.warn(`⚠️ Mock moderation audit endpoint not implemented: ${method} /${segments.join('/')}`);
        return this.wrapSuccess({});
    }
    handleAudit(method, segments, body) {
        const resource = segments[0];
        if (resource === 'log' && method === 'post') {
            this.audits.push({ entry: body });
            return this.wrapSuccess({ logged: true });
        }
        if (resource === 'query' && method === 'post') {
            return this.wrapSuccess({
                entries: this.audits.map(a => a.entry),
                total: this.audits.length,
                hasMore: false,
            });
        }
        if (resource === 'stats' && method === 'get') {
            return this.wrapSuccess({
                totalEntries: this.audits.length,
                lastEntry: this.audits[this.audits.length - 1]?.entry || null,
            });
        }
        console.warn(`⚠️ Mock audit endpoint not implemented: ${method} /${segments.join('/')}`);
        return this.wrapSuccess({});
    }
    handlePermissions(method, segments, body, params) {
        if (segments[0] === 'user' && segments.length === 2 && method === 'get') {
            return this.getUserPermissions(segments[1]);
        }
        if (segments[0] === 'user' && segments[2] === 'grant' && method === 'post') {
            return this.grantPermissions(segments[1], body);
        }
        if (segments[0] === 'user' && segments[2] === 'revoke' && method === 'post') {
            return this.revokePermissions(segments[1], body);
        }
        if (segments[0] === 'users' && method === 'get') {
            return this.getAllPermissions();
        }
        if (segments[0] === 'roles' && method === 'put') {
            return this.wrapSuccess({ updated: true });
        }
        console.warn(`⚠️ Mock permissions endpoint not implemented: ${method} /${segments.join('/')}`);
        return this.wrapSuccess({});
    }
    createCase(request) {
        const caseId = this.generateCaseId();
        const now = new Date().toISOString();
        const playerId = request.event.playerId;
        const initialModerator = DEFAULT_MODERATOR_ID;
        const baseAction = {
            caseId,
            playerId,
            moderatorId: initialModerator,
            action: 'FLAG',
            reason: `Automatic case creation for ${request.event.gameType}`,
            createdAt: now,
        };
        const record = {
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
                environment_1.envConfig.channels.antiCheatPings,
                environment_1.envConfig.channels.moderationLogs,
            ].filter(Boolean),
        });
    }
    getCase(caseId, request) {
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
    getPlayerCases(playerId, params) {
        const cases = Array.from(this.cases.values()).filter(record => record.playerId === playerId);
        return this.wrapSuccess({
            cases: cases.map(record => record.current),
            total: cases.length,
            hasMore: false,
        });
    }
    updateCase(caseId, updates) {
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
    searchCases(filters) {
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
    getCaseStats() {
        const allCases = Array.from(this.cases.values());
        const openCases = allCases.filter(record => record.status === 'OPEN').length;
        const closedCases = allCases.length - openCases;
        const casesByPriority = allCases.reduce((acc, record) => {
            acc[record.priority] = (acc[record.priority] || 0) + 1;
            return acc;
        }, {});
        const casesByGameType = allCases.reduce((acc, record) => {
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
    archiveCases(body) {
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
    takeAction(caseId, request) {
        const record = this.cases.get(caseId);
        if (!record) {
            return this.wrapError(`Case ${caseId} not found`);
        }
        const actionEntry = {
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
    getCaseHistory(caseId) {
        const record = this.cases.get(caseId);
        if (!record) {
            return this.wrapError(`Case ${caseId} not found`);
        }
        return this.wrapSuccess(record.history);
    }
    getPendingCases(params) {
        const pending = Array.from(this.cases.values()).filter(record => record.status === 'OPEN');
        return this.wrapSuccess({
            cases: pending.map(record => record.current),
            total: pending.length,
            urgentCount: pending.filter(record => record.priority === 'URGENT').length,
        });
    }
    assignCase(caseId, body) {
        const record = this.cases.get(caseId);
        if (!record) {
            return this.wrapError(`Case ${caseId} not found`);
        }
        record.assignedModeratorId = body.moderatorId;
        this.cases.set(caseId, record);
        return this.wrapSuccess({ assigned: true });
    }
    submitAntiCheatEvent(event) {
        const eventId = this.generateEventId();
        this.antiCheatEvents.set(eventId, event);
        return this.wrapSuccess({
            eventId,
            caseCreated: true,
        });
    }
    getAntiCheatEvent(eventId) {
        const event = this.antiCheatEvents.get(eventId);
        if (!event) {
            return this.wrapError(`Event ${eventId} not found`);
        }
        return this.wrapSuccess(event);
    }
    getPlayerAntiCheatStats(playerId) {
        const events = Array.from(this.antiCheatEvents.values()).filter(event => event.playerId === playerId);
        return this.wrapSuccess({
            totalEvents: events.length,
            recentEvents: events.slice(-5),
            riskScore: Math.min(100, events.length * 10),
            lastEvent: events[events.length - 1],
        });
    }
    createModerationAudit(body) {
        const entry = {
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
    getModerationAuditHistory(params) {
        const entries = this.moderationAudits.filter(entry => !params?.caseId || entry.caseId === params.caseId);
        return this.wrapSuccess({
            entries,
            total: entries.length,
            hasMore: false,
        });
    }
    getModerationAuditStats() {
        const actionsByType = this.moderationAudits.reduce((acc, entry) => {
            acc[entry.action] = (acc[entry.action] || 0) + 1;
            return acc;
        }, {});
        return this.wrapSuccess({
            totalActions: this.moderationAudits.length,
            actionsByType,
        });
    }
    exportModerationAudits() {
        const exportId = `export-${Date.now()}`;
        return this.wrapSuccess({
            exportId,
            downloadUrl: `https://mock.example.com/${exportId}.json`,
            recordCount: this.moderationAudits.length,
            fileSize: this.moderationAudits.length * 1024,
            expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        });
    }
    getUserPermissions(userId) {
        const existing = this.permissions.get(userId);
        if (existing) {
            return this.wrapSuccess(existing.context);
        }
        const context = {
            userId,
            level: types_1.PermissionLevel.SENIOR_MODERATOR,
            permissions: types_1.PERMISSION_LEVEL_PERMISSIONS[types_1.PermissionLevel.SENIOR_MODERATOR],
            isAdmin: false,
            isSeniorModerator: true,
            isModerator: true,
        };
        this.permissions.set(userId, { context });
        return this.wrapSuccess(context);
    }
    grantPermissions(userId, body) {
        const context = this.getUserPermissions(userId).data;
        const updatedPermissions = Array.from(new Set([...context.permissions, ...(body.permissions || [])]));
        const newContext = {
            ...context,
            permissions: updatedPermissions,
        };
        this.permissions.set(userId, { context: newContext });
        return this.wrapSuccess({ granted: body.permissions || [] });
    }
    revokePermissions(userId, body) {
        const context = this.getUserPermissions(userId).data;
        const revokedSet = new Set(body.permissions || []);
        const updatedPermissions = context.permissions.filter(permission => !revokedSet.has(permission));
        const newContext = {
            ...context,
            permissions: updatedPermissions,
        };
        this.permissions.set(userId, { context: newContext });
        return this.wrapSuccess({ revoked: body.permissions || [] });
    }
    getAllPermissions() {
        const users = Array.from(this.permissions.values()).map(record => record.context);
        return this.wrapSuccess({
            users,
            total: users.length,
        });
    }
    wrapSuccess(data) {
        return {
            success: true,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                requestId: `mock-${Math.random().toString(36).slice(2, 8)}`,
            },
        };
    }
    wrapError(message) {
        return {
            success: false,
            error: message,
            metadata: {
                timestamp: new Date().toISOString(),
                requestId: `mock-${Math.random().toString(36).slice(2, 8)}`,
            },
        };
    }
    generateCaseId() {
        this.caseCounter += 1;
        return `CASE-${this.caseCounter}`;
    }
    generateEventId() {
        return `EVENT-${crypto_1.default.randomUUID()}`;
    }
    generateAuditId() {
        return `AUDIT-${crypto_1.default.randomUUID()}`;
    }
}
exports.MockBackend = MockBackend;
exports.mockBackend = new MockBackend();
//# sourceMappingURL=mockBackend.js.map