"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
function parseCsv(filePath) {
    const csv = fs_1.default.readFileSync(filePath, 'utf8').trim();
    const lines = csv.split(/\r?\n/).filter(Boolean);
    return lines.map(line => {
        const [playerId, username, game, violation, severity] = line.split(',').map(value => value.trim());
        return { playerId, username, game, violation, severity };
    });
}
function mapToEvent(row, index) {
    const severity = row.severity.toLowerCase();
    const severityToSpike = {
        low: 12,
        medium: 32,
        high: 58,
        critical: 85,
    };
    const spike = severityToSpike[severity] ?? 25;
    return {
        gameType: row.game || 'unknown_game',
        previousPings: Math.max(0, 3 - index),
        playerId: row.playerId,
        username: row.username,
        winrateSpike: spike,
        movementFlags: [row.violation || 'anomaly_detected'],
        deviceId: `device-${row.playerId}`,
        ipRisk: severity === 'high' || severity === 'critical' ? 'VPN_DETECTED' : null,
        timestamp: new Date(Date.now() - index * 60000).toISOString(),
    };
}
async function sendEvent(event, targetUrl, secret) {
    const payload = JSON.stringify(event);
    const signature = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
    await axios_1.default.post(targetUrl, event, {
        headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': signature,
        },
    });
}
async function main() {
    const csvPath = process.argv[2] ||
        path_1.default.resolve(__dirname, '../../tests/load/payloads/anti-cheat-events.csv');
    if (!fs_1.default.existsSync(csvPath)) {
        console.error(`❌ CSV file not found at ${csvPath}`);
        process.exit(1);
    }
    const port = process.env.WEBHOOK_PORT || '3000';
    const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:${port}/webhooks/anticheat`;
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
        console.error('❌ WEBHOOK_SECRET is required to replay events');
        process.exit(1);
    }
    const rows = parseCsv(csvPath);
    if (!rows.length) {
        console.error('❌ CSV did not contain any rows to replay');
        process.exit(1);
    }
    console.log(`📡 Replaying ${rows.length} anti-cheat events to ${webhookUrl}`);
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const event = mapToEvent(row, index);
        try {
            await sendEvent(event, webhookUrl, secret);
            console.log(`✅ Sent event for player ${event.playerId}`);
        }
        catch (error) {
            console.error(`❌ Failed to send event for ${event.playerId}:`, error instanceof Error ? error.message : error);
        }
    }
    console.log('🎉 Replay complete');
}
main().catch(error => {
    console.error('❌ Replay failed:', error);
    process.exit(1);
});
//# sourceMappingURL=replayAntiCheat.js.map