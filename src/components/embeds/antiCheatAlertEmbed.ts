import { EmbedBuilder, ActionRowBuilder } from 'discord.js';
import { AntiCheatEvent } from '../../types/AntiCheatEvent';
import {
  flagPlayerButton,
  spectatePlayerButton,
  requestEvidenceButton,
  banPlayerButton,
  resolveCaseButton,
} from '../buttons';

/**
 * Builds the anti-cheat alert embed with case details.
 * This is a simple embed without buttons for display purposes.
 *
 * @param event The anti-cheat event data
 * @param caseId The unique case identifier
 * @returns The embed builder
 */
export function buildAntiCheatAlertEmbed(event: AntiCheatEvent, caseId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`🚨 Anti-Cheat Alert — Case #${caseId}`)
    .addFields(
      { name: "Game Type", value: event.gameType || "Unknown", inline: true },
      { name: "Previous Anti‑Cheat Pings", value: event.previousPings?.toString() || "0", inline: true },
      { name: "Winrate Spike", value: `${event.winrateSpike}%`, inline: true },
      { name: "Player", value: `${event.username} (${event.playerId})`, inline: false },
      { name: "Movement Flags", value: event.movementFlags.join(", ") || "None", inline: false },
      { name: "Device ID", value: event.deviceId || "Unknown", inline: true },
      { name: "IP Risk", value: event.ipRisk || "None", inline: true },
      { name: "Time", value: `<t:${Math.floor(new Date(event.timestamp).getTime() / 1000)}:R>`, inline: true }
    )
    .setColor(0xff0000)
    .setTimestamp();
}

/**
 * Builds the anti-cheat alert embed with moderator action buttons.
 *
 * This embed is sent to the anti-cheat pings channel when a new case is created.
 * It includes all relevant case information and provides quick-action buttons
 * for moderators to investigate and respond to the alert.
 *
 * @param event The anti-cheat event data
 * @param caseId The unique case identifier
 * @returns Object containing the embed and action buttons for Discord message
 */
export function buildAntiCheatAlertEmbedWithButtons(event: AntiCheatEvent, caseId: string) {
  // Create the embed with case details
  const embed = new EmbedBuilder()
    .setTitle(`🚨 Anti-Cheat Alert — Case #${caseId}`)
    .addFields(
      { name: "Game Type", value: event.gameType || "Unknown", inline: true },
      { name: "Previous Anti‑Cheat Pings", value: event.previousPings?.toString() || "0", inline: true },
      { name: "Winrate Spike", value: `${event.winrateSpike}%`, inline: true },
      { name: "Player", value: `${event.username} (${event.playerId})`, inline: false },
      { name: "Movement Flags", value: event.movementFlags.join(", ") || "None", inline: false },
      { name: "Device ID", value: event.deviceId || "Unknown", inline: true },
      { name: "IP Risk", value: event.ipRisk || "None", inline: true },
      { name: "Time", value: `<t:${Math.floor(new Date(event.timestamp).getTime() / 1000)}:R>`, inline: true }
    )
    .setColor(0xff0000)
    .setTimestamp()
    .setFooter({ text: `Case ID: ${caseId} • Use buttons below to take action` });

  // Create action buttons with case context
  // Note: Buttons need caseId and playerId embedded in their customId for context
  const flagButton = flagPlayerButton.setCustomId(`flag_player_${caseId}_${event.playerId}`);
  const spectateButton = spectatePlayerButton.setCustomId(`spectate_player_${caseId}_${event.playerId}`);
  const evidenceButton = requestEvidenceButton.setCustomId(`request_evidence_${caseId}_${event.playerId}`);
  const banButton = banPlayerButton.setCustomId(`ban_player_${caseId}_${event.playerId}`);
  const resolveButton = resolveCaseButton.setCustomId(`resolve_case_${caseId}_${event.playerId}`);

  // Create two action rows for better layout (3 buttons on top, 2 on bottom)
  const topRow = new ActionRowBuilder()
    .addComponents(flagButton, spectateButton, evidenceButton);

  const bottomRow = new ActionRowBuilder()
    .addComponents(banButton, resolveButton);

  return {
    embeds: [embed],
    components: [topRow, bottomRow],
  };
}
