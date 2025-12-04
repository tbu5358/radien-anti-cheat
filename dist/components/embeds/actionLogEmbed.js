"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildActionLogEmbed = buildActionLogEmbed;
const discord_js_1 = require("discord.js");
function buildActionLogEmbed(action) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`📝 Moderation Action Log`)
        .addFields({ name: "Case ID", value: action.caseId }, { name: "Moderator", value: `<@${action.moderatorId}> (${action.moderatorId})` }, { name: "Action Taken", value: action.action }, { name: "Player Affected", value: action.playerId }, { name: "Reason", value: action.reason || "No reason provided" }, { name: "Timestamp", value: `<t:${Math.floor(new Date(action.createdAt).getTime() / 1000)}:R>` })
        .setColor(0xffa500)
        .setTimestamp();
}
//# sourceMappingURL=actionLogEmbed.js.map