import { EmbedBuilder } from 'discord.js';
import { ModerationCase } from '../../types/ModerationCase';

export function buildActionLogEmbed(action: ModerationCase) {
  return new EmbedBuilder()
    .setTitle(`📝 Moderation Action Log`)
    .addFields(
      { name: "Case ID", value: action.caseId },
      { name: "Moderator", value: `<@${action.moderatorId}> (${action.moderatorId})` },
      { name: "Action Taken", value: action.action },
      { name: "Player Affected", value: action.playerId },
      { name: "Reason", value: action.reason || "No reason provided" },
      { name: "Timestamp", value: `<t:${Math.floor(new Date(action.createdAt).getTime() / 1000)}:R>` }
    )
    .setColor(0xffa500)
    .setTimestamp();
}
