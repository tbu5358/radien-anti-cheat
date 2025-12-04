import { ButtonInteraction, ButtonBuilder } from 'discord.js';
/**
 * Handles the "Resolve / Dismiss" button interaction.
 *
 * This button allows moderators to close a case by marking it as resolved or dismissed.
 * When clicked, it:
 * 1. Validates the moderator has RESOLVE_CASE permission
 * 2. Calls the moderation service to resolve the case
 * 3. Logs the resolution for audit purposes
 * 4. Updates case status and notifies relevant systems
 * 5. Provides feedback on the resolution
 *
 * This action permanently closes the case, so it's important to ensure
 * the moderator has properly reviewed all evidence and made an appropriate decision.
 *
 * @param interaction The Discord button interaction
 */
export declare function handleResolveCase(interaction: ButtonInteraction): Promise<void>;
/**
 * Button configuration for the Resolve Case action.
 * Used when creating button components in embeds.
 */
export declare const resolveCaseButton: ButtonBuilder;
//# sourceMappingURL=resolveCase.d.ts.map