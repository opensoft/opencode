# Fix Blocking File Writes in TUI

## Summary

The TUI experiences periodic UI freezes (several seconds) caused by synchronous `Bun.write()` calls that block the main render thread during disk I/O operations.

## Problem

Two locations in the TUI code call `Bun.write()` without awaiting the Promise:

1. **`kv.tsx:44`** - KV store persistence
   - Called on every settings change, terminal title update, UI state change
   - High frequency - multiple times per user interaction

2. **`local.tsx:133-139`** - Model store persistence
   - Called when cycling favorites (`cycleFavorite()`)
   - Called when selecting models with `recent: true` (`set()`)
   - Called when toggling favorites (`toggleFavorite()`)

### Why This Causes Freezes

Although `Bun.write()` returns a Promise, the underlying file I/O is initiated synchronously before the Promise is created. Without `await` or `.then()`, the write operation still blocks the event loop for the duration of the disk write, freezing the UI.

## Solution

Convert blocking writes to fire-and-forget with error handling:

```typescript
// Before (blocking)
Bun.write(file, JSON.stringify(data))

// After (non-blocking)
Bun.write(file, JSON.stringify(data)).catch(() => {})
```

This allows the write to happen asynchronously without blocking the render loop. The `.catch(() => {})` prevents unhandled promise rejections if the write fails.

## Impact

- **Risk**: Low - write failures are silently ignored, but data is non-critical (preferences, recent models)
- **Benefit**: Eliminates UI freezes during state persistence
- **Files Changed**: 2 files, minimal changes

## Affected Files

| File | Line | Change |
|------|------|--------|
| `packages/opencode/src/cli/cmd/tui/context/kv.tsx` | 44 | Add `.catch(() => {})` |
| `packages/opencode/src/cli/cmd/tui/context/local.tsx` | 133-139 | Add `.catch(() => {})` |
