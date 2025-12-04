"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCaseButton = exports.rejectBanButton = exports.approveBanButton = exports.banPlayerButton = exports.requestEvidenceButton = exports.spectatePlayerButton = exports.flagPlayerButton = void 0;
// Button handlers and registry
__exportStar(require("./buttonRegistry"), exports);
__exportStar(require("./buttonUtils"), exports);
// Individual button implementations
__exportStar(require("./flagPlayer"), exports);
__exportStar(require("./spectatePlayer"), exports);
__exportStar(require("./requestEvidence"), exports);
__exportStar(require("./banPlayer"), exports);
__exportStar(require("./resolveCase"), exports);
// Re-export commonly used button configurations for convenience
var flagPlayer_1 = require("./flagPlayer");
Object.defineProperty(exports, "flagPlayerButton", { enumerable: true, get: function () { return flagPlayer_1.flagPlayerButton; } });
var spectatePlayer_1 = require("./spectatePlayer");
Object.defineProperty(exports, "spectatePlayerButton", { enumerable: true, get: function () { return spectatePlayer_1.spectatePlayerButton; } });
var requestEvidence_1 = require("./requestEvidence");
Object.defineProperty(exports, "requestEvidenceButton", { enumerable: true, get: function () { return requestEvidence_1.requestEvidenceButton; } });
var banPlayer_1 = require("./banPlayer");
Object.defineProperty(exports, "banPlayerButton", { enumerable: true, get: function () { return banPlayer_1.banPlayerButton; } });
Object.defineProperty(exports, "approveBanButton", { enumerable: true, get: function () { return banPlayer_1.approveBanButton; } });
Object.defineProperty(exports, "rejectBanButton", { enumerable: true, get: function () { return banPlayer_1.rejectBanButton; } });
var resolveCase_1 = require("./resolveCase");
Object.defineProperty(exports, "resolveCaseButton", { enumerable: true, get: function () { return resolveCase_1.resolveCaseButton; } });
//# sourceMappingURL=index.js.map