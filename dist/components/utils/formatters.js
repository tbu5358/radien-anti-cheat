"use strict";
// Utility functions for formatting data in embeds and messages
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTimestamp = formatTimestamp;
exports.formatPlayerInfo = formatPlayerInfo;
exports.formatMovementFlags = formatMovementFlags;
exports.formatPercentage = formatPercentage;
function formatTimestamp(timestamp) {
    return `<t:${Math.floor(new Date(timestamp).getTime() / 1000)}:R>`;
}
function formatPlayerInfo(username, playerId) {
    return `${username} (${playerId})`;
}
function formatMovementFlags(flags) {
    return flags.length > 0 ? flags.join(", ") : "None";
}
function formatPercentage(value) {
    return `${value}%`;
}
//# sourceMappingURL=formatters.js.map