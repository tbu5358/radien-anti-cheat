/**
 * Central export file for all button components and handlers.
 *
 * This file provides a single entry point for importing button-related functionality,
 * ensuring consistent usage and easy maintenance.
 *
 * @example
 * ```typescript
 * import { handleButtonInteraction, flagPlayerButton } from '../components/buttons';
 * import { createEvidenceModal } from '../components/buttons';
 * ```
 */

// Button handlers and registry
export * from './buttonRegistry';
export * from './buttonUtils';

// Individual button implementations
export * from './flagPlayer';
export * from './spectatePlayer';
export * from './requestEvidence';
export * from './banPlayer';
export * from './resolveCase';

// Re-export commonly used button configurations for convenience
export { flagPlayerButton } from './flagPlayer';
export { spectatePlayerButton } from './spectatePlayer';
export { requestEvidenceButton } from './requestEvidence';
export {
  banPlayerButton,
  approveBanButton,
  rejectBanButton,
} from './banPlayer';
export { resolveCaseButton } from './resolveCase';
