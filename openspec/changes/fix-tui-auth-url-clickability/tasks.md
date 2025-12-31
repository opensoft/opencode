# Implementation Tasks

## Tasks

- [x] Create `Link` component with OSC 8 hyperlink support in `packages/opencode/src/cli/cmd/tui/ui/link.tsx`
- [x] Export `Link` component from UI index (if applicable) - N/A, direct import used
- [x] Update `CodeMethod` component in `dialog-provider.tsx` to use `Link` for URL display
- [x] Update `AutoMethod` component in `dialog-provider.tsx` to use `Link` for URL display
- [x] Test in Wave Terminal - verify full URL is clickable
- [ ] Test in other terminal emulators (iTerm2, Windows Terminal, etc.)
- [x] Consider adding clipboard copy fallback for terminals without OSC 8 support - N/A, used click handler approach instead
- [x] Build and verify no TypeScript errors
- [ ] Submit PR to sst/opencode
