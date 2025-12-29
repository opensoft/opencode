# Tasks

## Implementation Checklist

- [x] Fix blocking write in `kv.tsx:44`
  - Add `.catch(() => {})` to `Bun.write()` call in `set()` method

- [x] Fix blocking write in `local.tsx:133-139`
  - Add `.catch(() => {})` to `Bun.write()` call in `save()` function

- [ ] Test the changes
  - Verify TUI no longer freezes when changing settings
  - Verify TUI no longer freezes when selecting models
  - Verify TUI no longer freezes when toggling favorites

- [x] Commit and push changes
