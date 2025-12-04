# Type Definitions

This directory contains comprehensive TypeScript type definitions for the Anti-Cheat Moderation Bot. The type system is designed to provide strong typing, comprehensive documentation, and runtime type safety throughout the application.

## Directory Structure

```
types/
├── index.ts              # Central export file
├── AntiCheatEvent.ts     # Anti-cheat detection events
├── ModerationCase.ts     # Case management and actions
├── PlayerFlags.ts        # Player violation tracking
├── DiscordTypes.ts       # Discord integration types
├── ApiTypes.ts          # API request/response types
├── PermissionTypes.ts   # Access control and permissions
├── AuditTypes.ts        # Audit logging and history
└── README.md            # This file
```

## Core Concepts

### 1. AntiCheatEvent
Represents suspicious player behavior detected by the anti-cheat system. Contains game context, player information, and specific violation details.

### 2. ModerationCase
Tracks the lifecycle of an anti-cheat alert from detection through resolution. Maintains an audit trail of all moderator actions.

### 3. PlayerFlags
Persistent records of player violations and their severity levels. Used for pattern recognition and risk assessment.

### 4. Permission System
Hierarchical permission levels (User → Moderator → Senior Moderator → Administrator) with granular permissions for specific actions.

### 5. Audit Logging
Comprehensive logging of all system events, moderator actions, and security-relevant activities.

## Usage Examples

### Importing Types
```typescript
// Import specific types
import { AntiCheatEvent, ModerationCase } from '../types';

// Import all types
import * as Types from '../types';

// Import with type guards
import { AntiCheatEvent, isModerationAction } from '../types';
```

### Type-Safe API Calls
```typescript
import { ApiResponse, CreateCaseRequest } from '../types';

async function createModerationCase(event: AntiCheatEvent): Promise<ApiResponse> {
  const request: CreateCaseRequest = {
    event,
    priority: 'HIGH'
  };

  return api.post('/cases', request);
}
```

### Permission Checking
```typescript
import { PermissionLevel, Permission, PERMISSION_LEVEL_PERMISSIONS } from '../types';

function hasPermission(userLevel: PermissionLevel, requiredPermission: Permission): boolean {
  const userPermissions = PERMISSION_LEVEL_PERMISSIONS[userLevel];
  return userPermissions.includes(requiredPermission);
}
```

### Audit Logging
```typescript
import { AuditLogEntry, AuditEventType, AuditSeverity } from '../types';

const auditEntry: AuditLogEntry = {
  id: generateId(),
  eventType: AuditEventType.CASE_CREATED,
  severity: AuditSeverity.INFO,
  userId: moderatorId,
  targetId: caseId,
  action: 'create_case',
  description: `Case ${caseId} created for player ${playerId}`,
  timestamp: new Date().toISOString(),
  isAutomated: false
};
```

## Type Guards

The type system includes runtime type guards for additional safety:

```typescript
import { isModerationAction, isPermission } from '../types';

// Validate user input
if (isModerationAction(userInput.action)) {
  // TypeScript now knows userInput.action is a valid ModerationAction
  processAction(userInput.action);
}

// Check permissions at runtime
if (isPermission(requestedPermission)) {
  checkAccess(user, requestedPermission);
}
```

## Best Practices

1. **Always use the provided types** instead of creating new ones
2. **Import types from the central index** for consistency
3. **Use type guards** for runtime validation of external data
4. **Document new types** with JSDoc comments
5. **Keep types focused** on single responsibilities
6. **Use enums** for fixed sets of values
7. **Make optional properties truly optional** with `?`

## Adding New Types

When adding new types:

1. Create a new `.ts` file with comprehensive JSDoc documentation
2. Export the types from the new file
3. Add exports to `index.ts`
4. Update this README with usage examples
5. Add type guards if runtime validation is needed

## Maintenance

- Review types regularly for completeness
- Update types when API contracts change
- Ensure type guards match enum values
- Keep documentation current with code changes
