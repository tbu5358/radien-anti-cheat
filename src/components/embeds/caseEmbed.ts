import { EmbedBuilder } from 'discord.js';
import { ModerationCase } from '../../types/ModerationCase';

export function buildCaseEmbed(caseData: ModerationCase) {
  return new EmbedBuilder()
    .setTitle(`📋 Moderation Case #${caseData.caseId}`)
    .addFields(
      { name: "Player ID", value: caseData.playerId },
      { name: "Action", value: caseData.action },
      { name: "Moderator", value: `<@${caseData.moderatorId}>` },
      { name: "Reason", value: caseData.reason || "No reason provided" },
      { name: "Created At", value: `<t:${Math.floor(new Date(caseData.createdAt).getTime() / 1000)}:R>` }
    )
    .setColor(0x0099ff)
    .setTimestamp();
}
