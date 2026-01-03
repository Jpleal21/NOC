# NOC Platform - Technical Debt & Future Improvements

**Last Updated**: 2026-01-02
**Status**: Non-blocking issues documented for future work

---

## Overview

This document tracks low-priority architectural improvements, optimizations, and technical debt that do not impact current functionality but could improve observability, flexibility, or maintainability.

---

## Database & Error Handling

### Issue #1: Silent DB Error Pattern Could Mask Systemic Issues

**Severity**: LOW
**Component**: Worker API - Deployment Endpoint
**Locations**:
- `worker/src/index.ts:431-443` (failed status update)
- `worker/src/index.ts:454-465` (success status update)
- `worker/src/index.ts:479-489` (error catch block status update)
- `worker/src/index.ts:658-666` (workflow_url update)

**Description**:
Non-critical database update failures are caught, logged to console, but not tracked in metrics. While correct behavior (deployment success/failure is communicated via SSE regardless of DB update status), repeated failures could indicate D1 connectivity issues, quota limits, or schema problems that would go unnoticed until critical operations fail.

**Current Behavior**:
```typescript
try {
  await db.updateDeployment(deploymentId, { workflow_url: workflowRunUrl });
} catch (dbError: any) {
  console.error('[NOC Worker] Warning: Failed to update workflow URL:', dbError.message);
  // Don't throw - workflow was successfully triggered
}
```

**Risk Assessment**:
- **Low immediate impact**: User experience unaffected (SSE provides deployment status)
- **Medium long-term impact**: Hidden DB issues could accumulate undetected
- **Scenarios of concern**:
  - D1 database reaching storage quota (updates fail silently)
  - Network connectivity degradation (intermittent failures)
  - Schema migrations breaking non-critical columns

**Recommended Solutions** (choose one):

1. **CloudFlare Analytics Integration** (Lightweight):
   ```typescript
   catch (dbError: any) {
     console.error('[NOC Worker] Warning: Failed to update workflow URL:', dbError.message);
     c.env.ANALYTICS?.writeDataPoint({
       blobs: ['db_update_failure', 'workflow_url'],
       doubles: [1],
       indexes: [deploymentId],
     });
   }
   ```

2. **D1 Error Logs Table** (More detailed):
   ```sql
   CREATE TABLE error_logs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     timestamp TEXT NOT NULL,
     error_type TEXT NOT NULL, -- 'db_update_failure'
     deployment_id TEXT,
     operation TEXT, -- 'workflow_url', 'status_update', etc.
     error_message TEXT,
     severity TEXT -- 'non_critical', 'warning', 'critical'
   );
   ```

3. **Sentry/External Monitoring** (Production-grade):
   - Track non-critical errors with `Sentry.captureException(dbError, { level: 'warning' })`
   - Set up alert thresholds (e.g., >10 DB errors/hour)

**Priority**: Low (implement during observability sprint)

---

## API Client Flexibility

### Issue #2: No Timeout Override Capability in DigitalOcean Service

**Severity**: VERY LOW
**Component**: DigitalOcean API Service
**Location**: `worker/src/services/digitalocean.ts:27`

**Description**:
All DigitalOcean API operations use a hardcoded 30-second timeout. While adequate for current operations, this limits flexibility for future use cases where different timeout values would be appropriate.

**Current Implementation**:
```typescript
private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Always 30s
  // ...
}
```

**Limitations**:
- **Droplet creation**: Could benefit from 60s timeout (can take 40-50s in rare cases)
- **Health checks**: Could use 5s timeout (should be fast)
- **Bulk operations**: Might need longer timeouts for large responses
- **Retry logic**: Cannot use shorter timeouts for quick retry attempts

**Recommended Solution**:
```typescript
interface RequestOptions extends RequestInit {
  timeout?: number; // Custom timeout in milliseconds
}

private async request<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const timeout = options?.timeout ?? 30000; // Default to 30s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const { timeout: _, ...fetchOptions } = options || {};
  // ... rest of implementation
}

// Usage examples:
await this.request('/droplets', { method: 'POST', timeout: 60000 }); // 60s
await this.request('/droplets/123', { timeout: 5000 }); // 5s health check
```

**Benefits**:
- More granular control over API behavior
- Better handling of slow operations (droplet creation, snapshots)
- Faster failure detection for quick operations
- No breaking changes (default 30s maintained)

**Risk Assessment**:
- **Current impact**: None - 30s works for all operations
- **Future impact**: Low - might need this if adding bulk operations or health monitoring
- **Complexity**: Minimal - simple optional parameter

**Priority**: Very Low (consider during next DigitalOcean service refactor)

---

## Deferred Frontend Issues

The following frontend issues were identified in the November 2025 audit but deferred as LOW priority:

### Issue #3: Hardcoded Form Reset in DeploymentForm.vue

**Severity**: LOW
**Location**: `frontend/src/components/DeploymentForm.vue:390-408`

**Description**: Form reset logic manually sets each field to its default value instead of using a reactive reset pattern.

**Recommendation**: Use Vue's `reactive()` with a factory function:
```javascript
const createDefaultFormState = () => ({
  server_name: '',
  droplet_size: 's-2vcpu-4gb',
  // ... all fields
});

const formData = reactive(createDefaultFormState());

function resetForm() {
  Object.assign(formData, createDefaultFormState());
}
```

---

### Issue #4: Inconsistent Error Handling UX

**Severity**: LOW
**Locations**: Multiple files

**Description**: Error toasts use inconsistent duration, descriptions, and formatting across components.

**Recommendation**: Create standardized error handling composable:
```javascript
// composables/useErrorHandling.js
export function useErrorHandling() {
  function showError(title, error, options = {}) {
    toast.error(title, {
      description: error.message || error,
      duration: options.duration || 5000,
      action: options.retry ? {
        label: 'Retry',
        onClick: options.retry
      } : undefined
    });
  }

  return { showError };
}
```

---

### Issue #5: Development Console Logs in Production Code

**Severity**: LOW
**Locations**: Multiple files

**Description**: `console.log()` statements throughout frontend code for debugging.

**Recommendation**:
1. Use a logger utility that respects `import.meta.env.MODE`
2. Add ESLint rule to prevent console.log in production builds
3. Consider using `debug` package for namespaced logging

---

## Implementation Priority

**High Priority** (Next sprint):
- None currently

**Medium Priority** (Next quarter):
- None currently

**Low Priority** (Future work):
- Issue #1: DB error tracking/monitoring (when implementing observability)
- Issue #3: Frontend form reset refactor (when refactoring DeploymentForm)
- Issue #4: Standardized error handling (when improving UX consistency)
- Issue #5: Console log cleanup (before production release)

**Very Low Priority** (As needed):
- Issue #2: DigitalOcean timeout override (when adding bulk operations or health checks)

---

## Review Schedule

- **Quarterly Review**: Re-assess priority of deferred issues
- **Pre-Release Review**: Ensure no LOW issues have become blocking
- **Observability Sprint**: Implement Issue #1 (DB error tracking)
- **UX Polish Sprint**: Address Issues #3, #4, #5 (frontend improvements)

---

## Notes

- All issues documented here are **non-blocking** and do not impact current functionality
- Priority levels may change based on product roadmap and user feedback
- New technical debt should be added to this document with proper severity assessment
- Critical/High severity issues should be tracked in GitHub Issues, not this document
