# Button Components

This directory contains the comprehensive button interaction system for the Anti-Cheat Moderation Bot. Each button provides secure, audited moderation actions with proper permission checking and user feedback.

## Architecture Overview

```
buttons/
├── index.ts              # Central exports
├── buttonRegistry.ts     # Handler routing system
├── buttonUtils.ts        # Shared utilities and permissions
├── flagPlayer.ts         # Player flagging functionality
├── spectatePlayer.ts     # Live game spectating
├── requestEvidence.ts    # Evidence request system
├── banPlayer.ts          # Ban review and approval system
├── resolveCase.ts        # Case resolution functionality
└── README.md            # This file
```

## Permission-Based Access Control

All buttons implement comprehensive permission checking:

| Button | Permission Required | Description |
|--------|-------------------|-------------|
| 🟧 Flag Player | `FLAG_PLAYER` | Mark player for monitoring |
| 👁️ Spectate | `SPECTATE_PLAYER` | Access live game spectating |
| 📋 Request Evidence | `REQUEST_EVIDENCE` | Request additional evidence |
| 🚫 Submit Ban Review | `SUBMIT_BAN_REVIEW` | Submit case for ban consideration |
| ✅ Approve Ban | `APPROVE_BAN` | Senior mod ban approval |
| ❌ Reject Ban | `REJECT_BAN` | Senior mod ban rejection |
| ✅ Resolve Case | `RESOLVE_CASE` | Close case as resolved |

## Button Handler Functions

### Flag Player Button
```typescript
import { handleFlagPlayer, flagPlayerButton } from '../components/buttons';

// Handle the interaction
await handleFlagPlayer(interaction);

// Use in embed creation
const row = new ActionRowBuilder().addComponents(flagPlayerButton);
```

**Process:**
1. Validates `FLAG_PLAYER` permission
2. Extracts case and player context
3. Calls moderation service to flag player
4. Logs audit event
5. Provides user feedback

### Spectate Player Button
```typescript
import { handleSpectatePlayer, spectatePlayerButton } from '../components/buttons';
```

**Process:**
1. Validates `SPECTATE_PLAYER` permission
2. Generates secure spectate link
3. Logs access for audit purposes
4. Provides time-limited spectate URL

### Request Evidence Button
```typescript
import { handleRequestEvidence, handleEvidenceModalSubmit } from '../components/buttons';

// Handle button click (shows modal)
await handleRequestEvidence(interaction);

// Handle modal submission
await handleEvidenceModalSubmit(modalInteraction);
```

**Process:**
1. Shows evidence request modal
2. Collects evidence description and priority
3. Submits request to moderation service
4. Logs evidence request

### Ban Review System
```typescript
import {
  handleBanPlayer,
  handleBanReviewModalSubmit,
  handleApproveBan,
  handleRejectBan
} from '../components/buttons';
```

**Process:**
1. **Submit:** Shows detailed ban review modal
2. **Review:** Posts to senior mod channel with approval buttons
3. **Approve/Reject:** Senior mods review and decide

### Resolve Case Button
```typescript
import { handleResolveCase, resolveCaseButton } from '../components/buttons';
```

**Process:**
1. Validates `RESOLVE_CASE` permission
2. Closes case in moderation service
3. Logs resolution audit event
4. Archives case data

## Modal Interactions

The system supports modal forms for complex inputs:

### Evidence Request Modal
- **Fields:** Evidence description, priority level
- **Validation:** Required description, valid priority
- **Submission:** Creates evidence request in system

### Ban Review Modal
- **Fields:** Ban reason, evidence links, severity
- **Validation:** All fields required, valid severity
- **Submission:** Creates ban review for senior mods

## Button Registry System

### Centralized Handler Routing
```typescript
import { handleButtonInteraction, handleModalSubmitInteraction } from '../components/buttons';

// In interaction handler
if (interaction.isButton()) {
  await handleButtonInteraction(interaction);
} else if (interaction.isModalSubmit()) {
  await handleModalSubmitInteraction(interaction);
}
```

### Registry Health Checks
```typescript
import { getRegistryHealth } from '../components/buttons';

const health = getRegistryHealth();
console.log('Button registry health:', health.overall);
// healthy | degraded | unhealthy
```

## Utility Functions

### Permission Validation
```typescript
import { validateButtonInteraction } from '../components/buttons';

const validation = await validateButtonInteraction(interaction);
if (!validation.isValid) {
  // Handle permission denied
  await interaction.reply({
    content: validation.errorMessage,
    ephemeral: true
  });
}
```

### Context Extraction
```typescript
import { extractCaseId, extractPlayerId } from '../components/buttons';

const caseId = extractCaseId(interaction);
const playerId = extractPlayerId(interaction);
```

### Response Creation
```typescript
import { createButtonResponse } from '../components/buttons';

const response = createButtonResponse(
  'success',
  'Action Completed',
  'The player has been flagged successfully.'
);
```

## Error Handling

All button handlers implement comprehensive error handling:

### Permission Errors
- Clear error messages for missing permissions
- Audit logging of denied actions
- Graceful user feedback

### Context Errors
- Validation of case/player IDs
- Helpful error messages for missing context
- Logging for debugging

### Service Errors
- Circuit breaker protection
- Retry logic for transient failures
- Fallback error responses

## Audit Logging

Every button interaction is audited:

```typescript
// Automatic logging includes:
- User ID and permissions
- Action performed and timestamp
- Case/player context
- Success/failure status
- Processing time
- Error details (if applicable)
```

## Security Features

### Permission Validation
- Pre-action permission checking
- Role-based access control
- Audit trail of all access attempts

### Input Validation
- Modal form validation
- Context extraction safety
- Sanitization of user inputs

### Spectate Link Security
- Time-limited access tokens
- User-specific authentication
- Audit logging of all spectate access

## Testing

### Button Registration Validation
```typescript
import { validateButtonRegistration } from '../components/buttons';

const result = validateButtonRegistration();
// Check for missing handlers
console.log('Missing buttons:', result.missing);
```

### Mock Interactions
```typescript
// Create mock interaction for testing
const mockInteraction = {
  customId: 'flag_player_CASE123',
  user: { id: '123456789' },
  guildId: '987654321',
  // ... other required properties
} as ButtonInteraction;
```

## Future Enhancements

### Planned Features
- **Bulk Actions:** Select multiple cases for batch operations
- **Custom Workflows:** Configurable button sets per channel
- **Advanced Modals:** File upload support for evidence
- **Button Analytics:** Usage statistics and performance metrics

### Extensibility
- Easy to add new button types
- Modular handler system
- Configurable permission requirements
- Pluggable validation logic

## Performance Considerations

- **Deferred Replies:** Immediate acknowledgment prevents timeouts
- **Circuit Breakers:** Automatic failure protection
- **Efficient Logging:** Structured audit data
- **Minimal API Calls:** Batched operations where possible

## Maintenance

### Adding New Buttons
1. Create button handler file with comprehensive JSDoc
2. Add permission checking and validation
3. Register in buttonRegistry.ts
4. Export from index.ts
5. Update this README

### Permission Changes
When permissions change:
1. Update BUTTON_PERMISSIONS in buttonUtils.ts
2. Test all affected button handlers
3. Update documentation
4. Communicate changes to moderators

### Error Message Updates
When updating error messages:
1. Ensure consistency across handlers
2. Test user experience
3. Update any related documentation
4. Consider localization support
