"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCaseEmbed = buildCaseEmbed;
const discord_js_1 = require("discord.js");
function buildCaseEmbed(caseData) {
    return new discord_js_1.EmbedBuilder()
        .setTitle(`📋 Moderation Case #${caseData.caseId}`)
        .addFields({ name: "Player ID", value: caseData.playerId }, { name: "Action", value: caseData.action }, { name: "Moderator", value: `<@${caseData.moderatorId}>` }, { name: "Reason", value: caseData.reason || "No reason provided" }, { name: "Created At", value: `<t:${Math.floor(new Date(caseData.createdAt).getTime() / 1000)}:R>` })
        .setColor(0x0099ff)
        .setTimestamp();
}
//# sourceMappingURL=caseEmbed.js.map