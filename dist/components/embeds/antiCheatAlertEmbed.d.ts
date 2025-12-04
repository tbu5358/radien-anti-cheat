import { EmbedBuilder, ActionRowBuilder } from 'discord.js';
import { AntiCheatEvent } from '../../types/AntiCheatEvent';
/**
 * Builds the anti-cheat alert embed with case details.
 * This is a simple embed without buttons for display purposes.
 *
 * @param event The anti-cheat event data
 * @param caseId The unique case identifier
 * @returns The embed builder
 */
export declare function buildAntiCheatAlertEmbed(event: AntiCheatEvent, caseId: string): EmbedBuilder;
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
export declare function buildAntiCheatAlertEmbedWithButtons(event: AntiCheatEvent, caseId: string): {
    embeds: EmbedBuilder[];
    components: ActionRowBuilder<import("discord.js").AnyComponentBuilder>[];
};
//# sourceMappingURL=antiCheatAlertEmbed.d.ts.map