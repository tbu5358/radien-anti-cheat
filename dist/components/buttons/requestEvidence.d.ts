import { ButtonInteraction, ButtonBuilder } from 'discord.js';
/**
 * Handles the "Request Evidence" button interaction.
 *
 * This button allows moderators to request additional evidence for a case.
 * When clicked, it:
 * 1. Validates the moderator has REQUEST_EVIDENCE permission
 * 2. Opens a modal for the moderator to specify what evidence is needed
 * 3. Processes the modal submission and calls the moderation service
 * 4. Logs the evidence request for audit purposes
 * 5. Notifies relevant systems about the evidence request
 *
 * The modal collects:
 * - Description of required evidence
 * - Optional priority level
 *
 * @param interaction The Discord button interaction
 */
export declare function handleRequestEvidence(interaction: ButtonInteraction): Promise<void>;
/**
 * Handles the submission of the evidence request modal.
 * This function is called when a moderator submits the evidence request form.
 *
 * @param interaction The modal submit interaction
 */
export declare function handleEvidenceModalSubmit(interaction: any): Promise<void>;
/**
 * Button configuration for the Request Evidence action.
 * Used when creating button components in embeds.
 */
export declare const requestEvidenceButton: ButtonBuilder;
//# sourceMappingURL=requestEvidence.d.ts.map