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
import { ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
/**
 * Handles button interactions by routing them to the appropriate handler
 *
 * @param interaction The button interaction to handle
 * @returns Promise that resolves when handling is complete
 * @throws Error if no handler is found for the button ID
 */
export declare function handleButtonInteraction(interaction: ButtonInteraction): Promise<void>;
/**
 * Handles modal submit interactions by routing them to the appropriate handler
 *
 * @param interaction The modal submit interaction to handle
 * @returns Promise that resolves when handling is complete
 * @throws Error if no handler is found for the modal ID
 */
export declare function handleModalSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void>;
/**
 * Checks if a button custom ID is registered
 *
 * @param buttonId The button custom ID to check
 * @returns True if the button ID has a registered handler
 */
export declare function isButtonRegistered(buttonId: string): boolean;
/**
 * Checks if a modal custom ID is registered
 *
 * @param modalId The modal custom ID to check
 * @returns True if the modal ID has a registered handler
 */
export declare function isModalRegistered(modalId: string): boolean;
/**
 * Gets all registered button IDs
 *
 * @returns Array of all registered button custom IDs
 */
export declare function getRegisteredButtons(): string[];
/**
 * Gets all registered modal IDs
 *
 * @returns Array of all registered modal custom ID patterns
 */
export declare function getRegisteredModals(): string[];
/**
 * Validates that all expected buttons are registered
 * This is useful for ensuring no buttons are missing during development
 */
export declare function validateButtonRegistration(): {
    missing: string[];
    registered: string[];
    total: number;
};
/**
 * Validates that all expected modals are registered
 */
export declare function validateModalRegistration(): {
    missing: string[];
    registered: string[];
    total: number;
};
/**
 * Diagnostic function to check registry health
 * Useful for debugging and ensuring all components are properly registered
 */
export declare function getRegistryHealth(): {
    buttons: ReturnType<typeof validateButtonRegistration>;
    modals: ReturnType<typeof validateModalRegistration>;
    overall: 'healthy' | 'degraded' | 'unhealthy';
};
//# sourceMappingURL=buttonRegistry.d.ts.map