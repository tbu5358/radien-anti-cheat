"use strict";
/**
 * Button Registry and Handler Mapping System
 *
 * This module provides a centralized registry for all button interactions,
 * mapping button custom IDs to their respective handler functions. It ensures
 * that all button interactions are properly routed and handled consistently.
 *
 * The registry supports both regular button interactions and modal submissions,
 * providing a clean interface for the interaction handler to route events.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleButtonInteraction = handleButtonInteraction;
exports.handleModalSubmitInteraction = handleModalSubmitInteraction;
exports.isButtonRegistered = isButtonRegistered;
exports.isModalRegistered = isModalRegistered;
exports.getRegisteredButtons = getRegisteredButtons;
exports.getRegisteredModals = getRegisteredModals;
exports.validateButtonRegistration = validateButtonRegistration;
exports.validateModalRegistration = validateModalRegistration;
exports.getRegistryHealth = getRegistryHealth;
// Import all button handlers
const flagPlayer_1 = require("./flagPlayer");
const spectatePlayer_1 = require("./spectatePlayer");
const requestEvidence_1 = require("./requestEvidence");
const banPlayer_1 = require("./banPlayer");
const resolveCase_1 = require("./resolveCase");
// Phase C: Logging Standardization (Week 3)
// Added structured logger for consistent button routing logs
// Benefits: Better debugging, centralized logs, structured metadata for button interactions
// Future developers: Use logger.info/error for button routing operations
// Phase E: Error Handling Unification
// Added custom error classes for consistent error handling across button interactions
// Benefits: Structured error types, better error categorization, improved debugging
// Future developers: Use ButtonError for unknown button/modal interactions
const structuredLogger_1 = require("../../utils/structuredLogger");
const errors_1 = require("../../services/errors");
/**
 * Registry mapping button custom IDs to their handler functions
 */
const buttonHandlers = {
    // Case management buttons
    'flag_player': flagPlayer_1.handleFlagPlayer,
    'spectate_player': spectatePlayer_1.handleSpectatePlayer,
    'request_evidence': requestEvidence_1.handleRequestEvidence,
    'resolve_case': resolveCase_1.handleResolveCase,
    // Ban review system buttons
    'ban_player': banPlayer_1.handleBanPlayer,
    'approve_ban': banPlayer_1.handleApproveBan,
    'reject_ban': banPlayer_1.handleRejectBan,
};
/**
 * Registry mapping modal custom IDs to their submit handler functions
 */
const modalHandlers = {
    // Evidence request modals
    'evidence_modal': requestEvidence_1.handleEvidenceModalSubmit,
    // Ban review modals
    'ban_review_modal': banPlayer_1.handleBanReviewModalSubmit,
};
/**
 * Handles button interactions by routing them to the appropriate handler
 *
 * @param interaction The button interaction to handle
 * @returns Promise that resolves when handling is complete
 * @throws Error if no handler is found for the button ID
 */
async function handleButtonInteraction(interaction) {
    const buttonId = interaction.customId;
    structuredLogger_1.logger.info('Button interaction received', {
        buttonId,
        userId: interaction.user.id,
        guildId: interaction.guild?.id
    });
    // Extract base button ID (remove case-specific suffixes)
    const baseButtonId = buttonId.split('_')[0] + '_' + buttonId.split('_')[1];
    structuredLogger_1.logger.debug('Extracted base button ID', {
        originalId: buttonId,
        baseButtonId,
        userId: interaction.user.id
    });
    const handler = buttonHandlers[buttonId] || buttonHandlers[baseButtonId];
    structuredLogger_1.logger.debug('Handler lookup result', {
        fullButtonId: buttonId,
        baseButtonId: baseButtonId,
        handlerFound: !!handler,
        handlerName: handler?.name
    });
    if (!handler) {
        structuredLogger_1.logger.error('No handler found for button', {
            buttonId,
            baseButtonId,
            userId: interaction.user.id,
            availableHandlers: Object.keys(buttonHandlers)
        });
        throw new errors_1.ButtonError(buttonId, interaction.user.id, 'button');
    }
    structuredLogger_1.logger.info('Routing button interaction', {
        buttonId,
        handler: handler.name,
        userId: interaction.user.id,
        guildId: interaction.guild?.id
    });
    try {
        await handler(interaction);
    }
    catch (error) {
        structuredLogger_1.logger.error('Button handler error', {
            buttonId,
            handler: handler.name,
            error: error instanceof Error ? error.message : String(error),
            userId: interaction.user.id
        }, error instanceof Error ? error : undefined);
        // Attempt to send error response if interaction hasn't been replied to
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while processing this action. Please try again.',
                    ephemeral: true,
                });
            }
            catch (replyError) {
                structuredLogger_1.logger.error('Failed to send error response', {
                    error: replyError instanceof Error ? replyError.message : String(replyError)
                }, replyError instanceof Error ? replyError : undefined);
            }
        }
        throw error;
    }
}
/**
 * Handles modal submit interactions by routing them to the appropriate handler
 *
 * @param interaction The modal submit interaction to handle
 * @returns Promise that resolves when handling is complete
 * @throws Error if no handler is found for the modal ID
 */
async function handleModalSubmitInteraction(interaction) {
    const modalId = interaction.customId;
    // Extract base modal ID (remove case-specific suffixes)
    // For modal IDs like "ban_review_modal_CASE-1001", extract "ban_review_modal"
    const parts = modalId.split('_');
    const baseModalId = parts.length >= 3 ? parts.slice(0, 3).join('_') : modalId;
    const handler = modalHandlers[baseModalId];
    if (!handler) {
        structuredLogger_1.logger.error('No handler found for modal', {
            modalId,
            userId: interaction.user.id,
            availableHandlers: Object.keys(modalHandlers)
        });
        throw new errors_1.ButtonError(modalId, interaction.user.id, 'modal');
    }
    structuredLogger_1.logger.info('Routing modal submission', {
        modalId,
        handler: handler.name,
        userId: interaction.user.id,
        guildId: interaction.guild?.id
    });
    try {
        await handler(interaction);
    }
    catch (error) {
        structuredLogger_1.logger.error('Modal handler error', {
            modalId,
            handler: handler.name,
            error: error instanceof Error ? error.message : String(error),
            userId: interaction.user.id
        }, error instanceof Error ? error : undefined);
        // Attempt to send error response if interaction hasn't been replied to
        if (!interaction.replied && !interaction.deferred) {
            try {
                await interaction.reply({
                    content: '❌ An error occurred while processing your submission. Please try again.',
                    ephemeral: true,
                });
            }
            catch (replyError) {
                structuredLogger_1.logger.error('Failed to send error response', {
                    error: replyError instanceof Error ? replyError.message : String(replyError)
                }, replyError instanceof Error ? replyError : undefined);
            }
        }
        throw error;
    }
}
/**
 * Checks if a button custom ID is registered
 *
 * @param buttonId The button custom ID to check
 * @returns True if the button ID has a registered handler
 */
function isButtonRegistered(buttonId) {
    const baseButtonId = buttonId.split('_')[0] + '_' + buttonId.split('_')[1];
    return buttonId in buttonHandlers || baseButtonId in buttonHandlers;
}
/**
 * Checks if a modal custom ID is registered
 *
 * @param modalId The modal custom ID to check
 * @returns True if the modal ID has a registered handler
 */
function isModalRegistered(modalId) {
    const baseModalId = modalId.split('_').slice(0, 2).join('_');
    return baseModalId in modalHandlers;
}
/**
 * Gets all registered button IDs
 *
 * @returns Array of all registered button custom IDs
 */
function getRegisteredButtons() {
    return Object.keys(buttonHandlers);
}
/**
 * Gets all registered modal IDs
 *
 * @returns Array of all registered modal custom ID patterns
 */
function getRegisteredModals() {
    return Object.keys(modalHandlers);
}
/**
 * Validates that all expected buttons are registered
 * This is useful for ensuring no buttons are missing during development
 */
function validateButtonRegistration() {
    // Expected button IDs based on the button files
    const expectedButtons = [
        'flag_player',
        'spectate_player',
        'request_evidence',
        'resolve_case',
        'submit_ban_review',
        'approve_ban',
        'reject_ban',
    ];
    const registered = getRegisteredButtons();
    const missing = expectedButtons.filter(id => !registered.includes(id));
    return {
        missing,
        registered,
        total: expectedButtons.length,
    };
}
/**
 * Validates that all expected modals are registered
 */
function validateModalRegistration() {
    // Expected modal ID patterns
    const expectedModals = [
        'evidence_modal',
        'ban_review_modal',
    ];
    const registered = getRegisteredModals();
    const missing = expectedModals.filter(id => !registered.includes(id));
    return {
        missing,
        registered,
        total: expectedModals.length,
    };
}
/**
 * Diagnostic function to check registry health
 * Useful for debugging and ensuring all components are properly registered
 */
function getRegistryHealth() {
    const buttons = validateButtonRegistration();
    const modals = validateModalRegistration();
    let overall = 'healthy';
    if (buttons.missing.length > 0 || modals.missing.length > 0) {
        overall = 'unhealthy';
    }
    return {
        buttons,
        modals,
        overall,
    };
}
//# sourceMappingURL=buttonRegistry.js.map