# Services Layer

This directory contains the comprehensive service layer for the Anti-Cheat Moderation Bot. The services handle all communication with the backend moderation APIs, providing a clean, typed interface for the rest of the application.

## Architecture Overview

```
services/
├── apiClient.ts          # Enhanced HTTP client with resilience patterns
├── errors.ts             # Custom error classes and handling
├── circuitBreaker.ts     # Circuit breaker implementation
├── antiCheatService.ts   # Anti-cheat event handling
├── moderationService.ts  # Moderation actions and case management
├── caseService.ts        # Case lifecycle management
├── auditService.ts       # Audit logging and compliance
├── permissionService.ts  # Access control and permissions
├── index.ts              # Central exports
└── README.md             # This file
```

## Core Components

### 1. API Client (`apiClient.ts`)
**Enhanced HTTP client with resilience patterns:**
- Automatic retry with exponential backoff
- Circuit breaker for fault tolerance
- Request/response interceptors for logging
- Timeout and error handling
- Comprehensive audit logging

### 2. Error Handling (`errors.ts`)
**Structured error management:**
- Custom error classes (`ApiError`, `TimeoutError`, `ValidationError`)
- Retry logic helpers
- Type guards for error checking
- Consistent error formatting

### 3. Circuit Breaker (`circuitBreaker.ts`)
**Fault tolerance implementation:**
- Prevents cascading failures
- Automatic recovery testing
- Configurable failure thresholds
- Registry for multiple endpoints

## Service Overview

### AntiCheatService
Handles anti-cheat event submissions and related operations.

```typescript
import { submitAntiCheatEvent, getPlayerAntiCheatStats } from '../services';

// Submit a suspicious event
const result = await submitAntiCheatEvent(event);

// Get player statistics
const stats = await getPlayerAntiCheatStats(playerId);
```

### ModerationService
Manages moderation actions on cases.

```typescript
import { flagPlayer, submitForBanReview, resolveCase } from '../services';

// Flag a player
await flagPlayer(caseId, moderatorId, 'Suspicious behavior detected');

// Submit for ban review
await submitForBanReview(caseId, moderatorId, 'Cheating detected', evidence);

// Resolve the case
await resolveCase(caseId, moderatorId, 'False positive');
```

### CaseService
Comprehensive case lifecycle management.

```typescript
import { createCase, getCase, getPlayerCases } from '../services';

// Create a new case
const caseResult = await createCase(event);

// Get case details with history
const caseDetails = await getCase(caseId, {
  includeEvent: true,
  includeHistory: true
});

// Get all cases for a player
const playerCases = await getPlayerCases(playerId);
```

### AuditService
Centralized audit logging and compliance tracking.

```typescript
import { createAuditLog, getUserAuditLogs } from '../services';

// Log a moderation action
await createAuditLog({
  eventType: AuditEventType.CASE_CREATED,
  severity: AuditSeverity.INFO,
  userId: moderatorId,
  targetId: caseId,
  action: 'case_created',
  description: 'New moderation case created',
});

// Get audit logs for a user
const logs = await getUserAuditLogs(userId);
```

### PermissionService
Role-based access control and permission management.

```typescript
import { checkPermission, getUserPermissionContext } from '../services';

// Check if user can perform action
const canFlag = await checkPermission(userId, Permission.FLAG_PLAYER);

// Get complete permission context
const context = await getUserPermissionContext(userId);
```

## Error Handling

All services follow consistent error handling patterns:

```typescript
try {
  const result = await someService.operation(params);
  // Handle success
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API-specific errors
    console.error(`API Error: ${error.message}`, {
      statusCode: error.statusCode,
      endpoint: error.endpoint,
      retryable: error.retryable,
    });
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    console.error(`Validation Error: ${error.message}`, {
      field: error.field,
      value: error.value,
    });
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}
```

## Resilience Patterns

### Circuit Breaker
Services automatically protect against cascading failures:

```typescript
// Circuit breakers are automatically managed
// Check status programmatically if needed
const stats = apiClient.getCircuitBreakerStats();
console.log('Circuit breaker status:', stats);
```

### Retry Logic
Failed requests are automatically retried with exponential backoff:

```typescript
// Retry configuration is handled automatically
// Customize if needed for specific endpoints
const customClient = new ApiClient({
  maxRetries: 5,
  retryDelay: 2000,
});
```

## Testing

Services are designed for easy testing:

```typescript
import { ApiClient } from '../services';

// Create isolated client for testing
const testClient = new ApiClient({
  baseURL: 'http://localhost:3001',
  enableCircuitBreaker: false, // Disable for tests
  enableAuditLogging: false,
});
```

## Performance Considerations

- **Connection pooling**: Axios handles connection reuse automatically
- **Request deduplication**: Consider implementing for high-frequency operations
- **Caching**: Add Redis/memory caching for frequently accessed data
- **Batch operations**: Use bulk endpoints for multiple operations
- **Compression**: Enable gzip compression for large payloads

## Security

- **Authentication**: Bearer tokens are automatically included
- **Input validation**: All inputs are validated before API calls
- **Audit logging**: All operations are logged for compliance
- **Rate limiting**: Consider implementing client-side rate limiting
- **Sensitive data**: Never log sensitive information in audit trails

## Monitoring

Services provide comprehensive logging and metrics:

```typescript
// Check service health
const health = await checkServiceHealth();
console.log('Service health:', health);

// Get circuit breaker statistics
const cbStats = apiClient.getCircuitBreakerStats();
console.log('Circuit breakers:', cbStats);
```

## Maintenance

### Adding New Services
1. Create the service file with comprehensive JSDoc
2. Export from `index.ts`
3. Add error handling and logging
4. Include type guards and validation
5. Update this README

### Error Handling Updates
When adding new error types:
1. Add to `errors.ts`
2. Update type guards
3. Document in service methods
4. Update error handling examples

### API Changes
When backend APIs change:
1. Update service method signatures
2. Update TypeScript interfaces
3. Add version compatibility handling
4. Update tests and documentation
