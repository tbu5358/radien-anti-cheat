# Slash Commands

This directory contains the comprehensive slash command system for the Anti-Cheat Moderation Bot. Each command provides secure, audited moderation functionality with proper permission checking and user feedback.

## Architecture Overview

```
commands/
├── index.ts              # Central exports and registration
├── commandRegistry.ts    # Handler routing system
├── commandUtils.ts       # Shared utilities and permissions
├── moderation/           # Moderation-specific commands
│   ├── index.ts
│   ├── caseLookup.ts     # /case command
│   └── modTools.ts       # /mod tools command
├── admin/                # Administrator commands
│   ├── index.ts
│   └── settings.ts       # /settings command
└── README.md            # This file
```

## Available Commands

### Moderation Commands

| Command | Description | Permission Required |
|---------|-------------|-------------------|
| `/case <caseId>` | View detailed case information | `VIEW_CASES` |
| `/mod tools` | Access internal moderation tools | `VIEW_AUDIT_LOGS` |

### Administrator Commands

| Command | Description | Permission Required |
|---------|-------------|-------------------|
| `/settings anticheat` | View system status and configuration | Administrator |

## Command Handler Functions

### Case Lookup Command (`/case`)
```typescript
import { handleCaseLookup } from '../commands/moderation/caseLookup';

// Handle the interaction
await handleCaseLookup(interaction);
```

**Process:**
1. Validates `VIEW_CASES` permission
2. Validates case ID format
3. Retrieves case details with event and history
4. Displays comprehensive case information
5. Logs access for audit purposes

**Features:**
- Shows case status, player info, and metadata
- Includes original anti-cheat event details
- Displays recent action history
- Audit logging of all case views

### Mod Tools Command (`/mod tools`)
```typescript
import { handleModTools } from '../commands/moderation/modTools';

// Handle the interaction
await handleModTools(interaction);
```

**Process:**
1. Validates `VIEW_AUDIT_LOGS` permission
2. Generates secure tool links
3. Displays interactive tool menu
4. Logs tool access for security

**Features:**
- Quick access buttons to common tools
- Personalized, time-limited links
- Security warnings and notices
- Comprehensive tool directory

### Settings Command (`/settings anticheat`)
```typescript
import { handleSettings } from '../commands/admin/settings';

// Handle the interaction
await handleSettings(interaction);
```

**Process:**
1. Validates Administrator permission
2. Gathers system statistics and status
3. Displays configuration and health information
4. Logs administrative access

**Features:**
- Real-time system health monitoring
- Circuit breaker status
- Case and audit statistics
- Configuration overview

## Permission System

### Permission Levels
- **Moderator**: Can use `/case` and `/mod tools`
- **Administrator**: Can use all commands including `/settings`

### Permission Validation
```typescript
import { validateCommandInteraction } from '../commands/commandUtils';

const validation = await validateCommandInteraction(interaction);
if (!validation.isValid) {
  // Handle permission denied
  await interaction.reply({
    content: validation.errorMessage,
    ephemeral: true
  });
}
```

### Permission Mapping
```typescript
const COMMAND_PERMISSIONS: Record<string, Permission> = {
  'case': Permission.VIEW_CASES,
  'mod': Permission.VIEW_AUDIT_LOGS,
  'settings': Permission.CONFIGURE_BOT,
};
```

## Command Registry System

### Centralized Handler Routing
```typescript
import { handleCommandInteraction } from '../commands';

// In interaction handler
if (interaction.isChatInputCommand()) {
  await handleCommandInteraction(interaction);
}
```

### Registry Health Checks
```typescript
import { getRegistryHealth } from '../commands';

const health = getRegistryHealth();
console.log('Command registry health:', health);
// Check for missing handlers or registration issues
```

## Utility Functions

### Response Creation
```typescript
import { createCommandResponse } from '../commands';

const response = createCommandResponse(
  'success',
  'Case Found',
  'Case details displayed below.'
);
```

### Case Information Formatting
```typescript
import { formatCaseInfo } from '../commands';

const formatted = formatCaseInfo(caseData);
// Returns structured embed information
```

### Audit Logging
```typescript
import { logCommandInteraction } from '../commands';

await logCommandInteraction(
  interaction,
  'case',
  true, // success
  { caseId, processingTimeMs: 150 }
);
```

## Error Handling

All commands implement comprehensive error handling:

### Permission Errors
- Clear error messages for missing permissions
- Audit logging of denied access attempts
- Graceful user feedback

### Validation Errors
- Input format validation with helpful messages
- Case ID format checking
- Parameter validation

### Service Errors
- Circuit breaker protection
- Timeout handling
- Fallback error responses

### System Errors
- API unavailability handling
- Database connection issues
- Unexpected error recovery

## Audit Logging

Every command execution is audited:

```typescript
// Automatic logging includes:
- User ID and permissions
- Command executed and parameters
- Success/failure status
- Processing time
- Error details (if applicable)
- Timestamp and session context
```

## Security Features

### Permission Validation
- Pre-execution permission checking
- Role-based access control
- Administrator permission verification

### Input Validation
- Command parameter validation
- Case ID format checking
- Input sanitization

### Audit Trail
- Complete command execution logging
- Parameter logging (sanitized)
- Access pattern monitoring

## Testing

### Command Registration Validation
```typescript
import { validateCommandRegistration } from '../commands';

const result = validateCommandRegistration();
// Check for missing handlers
console.log('Missing commands:', result.missing);
```

### Mock Interactions
```typescript
// Create mock command interaction for testing
const mockInteraction = {
  commandName: 'case',
  user: { id: '123456789' },
  options: {
    getString: (name: string) => name === 'caseid' ? 'CASE123' : null,
  },
  // ... other required properties
} as ChatInputCommandInteraction;
```

## Discord Registration

### Command Data Export
```typescript
import { getAllCommandData } from '../commands';

const commands = getAllCommandData();
// Register with Discord API
await client.application.commands.set(commands);
```

### Guild-Specific Commands
```typescript
// For testing in specific guilds
const guild = client.guilds.cache.get('GUILD_ID');
await guild.commands.set(commands);
```

## Performance Considerations

- **Deferred Replies:** Prevent timeout for long-running operations
- **Efficient Queries:** Optimized database queries for case lookups
- **Caching:** Consider caching frequently accessed data
- **Rate Limiting:** Built-in Discord rate limit handling
- **Audit Efficiency:** Structured logging for performance monitoring

## Future Enhancements

### Planned Features
- **Bulk Operations:** Commands for bulk case actions
- **Advanced Filtering:** Complex case search commands
- **Real-time Updates:** Live case status monitoring
- **Custom Commands:** Guild-specific command configuration
- **Analytics:** Command usage statistics

### Extensibility
- Easy addition of new commands
- Modular permission system
- Pluggable validation logic
- Configurable command options

## Maintenance

### Adding New Commands
1. Create command handler file with JSDoc documentation
2. Add permission checking and validation
3. Register in commandRegistry.ts
4. Export from appropriate index.ts
5. Update this README

### Permission Changes
When permissions change:
1. Update COMMAND_PERMISSIONS in commandUtils.ts
2. Test all affected commands
3. Update documentation
4. Communicate changes to moderators

### Error Message Updates
When updating error messages:
1. Ensure consistency across commands
2. Test user experience
3. Update any related documentation
4. Consider localization support
