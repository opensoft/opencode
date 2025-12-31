# Fix TUI Auth URL Clickability

## Problem Statement

When using `/connect` in the OpenCode TUI and selecting Anthropic OAuth authentication, the authorization URL is displayed wrapped across multiple lines due to the narrow dialog width. When users click on the URL, only the first line is recognized as a clickable link by the terminal emulator, resulting in an incomplete/invalid URL being opened in the browser.

### Current Behavior

```
https://claude.ai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-
5944d1962f5e&response_type=code&redirect_uri=https%3A%2F%2Fconsole.anthropic.com%2Foauth%2Fcod
e%2Fcallback&scope=org%3Acreate_api_key+user%3Aprofile+user%3Ainference&code_challenge=...
```

Clicking opens only: `https://claude.ai/oauth/authorize?code=true&client_id=9d1c250a-e61b-44d9-88ed-` (truncated at first line break)

### Expected Behavior

The entire URL should be clickable as a single hyperlink, OR alternative methods should be provided to access the full URL (copy to clipboard, auto-open browser).

## Root Cause

In `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx`, the URL is rendered as plain text:

```tsx
// In CodeMethod component (~line 136-139)
<text fg={theme.textMuted}>{props.authorization.instructions}</text>
<text fg={theme.primary}>{props.authorization.url}</text>

// In AutoMethod component (~line 114-116)
<text fg={theme.primary}>{props.authorization.url}</text>
<text fg={theme.textMuted}>{props.authorization.instructions}</text>
```

The `<text>` component renders plain colored text without terminal hyperlink escape sequences (OSC 8).

## Proposed Solution

### Option A: OSC 8 Hyperlinks (Recommended)

Use OSC 8 terminal escape sequences to make the entire URL a single clickable hyperlink regardless of visual line wrapping.

**OSC 8 Format:**
```
\x1b]8;;URL\x1b\\DISPLAY_TEXT\x1b]8;;\x1b\\
```

**Implementation:**

1. Create a `Link` component or utility in the TUI framework:

```tsx
// packages/opencode/src/cli/cmd/tui/ui/link.tsx
import { TextAttributes } from "@opentui/core"

interface LinkProps {
  href: string
  children?: string
  fg?: string
}

export function Link(props: LinkProps) {
  // OSC 8 hyperlink: \x1b]8;;URL\x07 TEXT \x1b]8;;\x07
  const linkStart = `\x1b]8;;${props.href}\x07`
  const linkEnd = `\x1b]8;;\x07`
  const displayText = props.children || props.href

  return (
    <text fg={props.fg}>
      {linkStart}{displayText}{linkEnd}
    </text>
  )
}
```

2. Update `dialog-provider.tsx` to use the Link component:

```tsx
// In CodeMethod
<Link href={props.authorization.url} fg={theme.primary}>
  {props.authorization.url}
</Link>

// In AutoMethod
<Link href={props.authorization.url} fg={theme.primary}>
  {props.authorization.url}
</Link>
```

### Option B: Copy to Clipboard Button

Add a keyboard shortcut or button to copy the URL to clipboard.

**Implementation:**

1. Add clipboard functionality to the dialog
2. Show instruction like "Press 'c' to copy URL to clipboard"
3. Use `navigator.clipboard` or spawn `xclip`/`pbcopy` command

### Option C: Auto-Open Browser

Automatically open the URL in the default browser instead of displaying it.

**Implementation:**

```typescript
import { spawn } from "child_process"

function openInBrowser(url: string) {
  const platform = process.platform
  const cmd = platform === "darwin" ? "open"
            : platform === "win32" ? "start"
            : "xdg-open"
  spawn(cmd, [url], { detached: true, stdio: "ignore" })
}
```

### Option D: Combination Approach (Best UX)

Combine options:
1. Use OSC 8 for clickable URL
2. Auto-open browser when authorization starts
3. Show "Press 'c' to copy URL" as fallback

## Files to Modify

| File | Changes |
|------|---------|
| `packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx` | Update URL rendering in `CodeMethod` and `AutoMethod` components |
| `packages/opencode/src/cli/cmd/tui/ui/link.tsx` | NEW: Create Link component with OSC 8 support |
| `packages/opencode/src/cli/cmd/tui/ui/index.ts` | Export new Link component |

## Implementation Steps

1. [ ] Fork/clone the OpenCode repository: `git clone https://github.com/sst/opencode.git`
2. [ ] Create new `Link` component with OSC 8 hyperlink support
3. [ ] Update `CodeMethod` component to use `Link` for URL display
4. [ ] Update `AutoMethod` component to use `Link` for URL display
5. [ ] Test in various terminal emulators (Wave, iTerm2, Windows Terminal, etc.)
6. [ ] Consider adding clipboard copy fallback for terminals without OSC 8 support
7. [ ] Submit PR to sst/opencode

## Testing

1. Run `opencode` TUI
2. Use `/connect` or `Ctrl+P` → "Connect provider"
3. Select "Anthropic" → "Claude Pro/Max"
4. Verify the URL is fully clickable
5. Verify clicking opens the complete URL in browser

### Terminal Compatibility

OSC 8 hyperlinks are supported by:
- iTerm2
- Windows Terminal
- GNOME Terminal (3.26+)
- Konsole
- Alacritty
- Kitty
- WezTerm
- Wave Terminal

## References

- [OSC 8 Hyperlinks Spec](https://gist.github.com/egmontkob/eb114294efbcd5adb1944c9f3cb5feda)
- [OpenCode Repository](https://github.com/sst/opencode)
- [OpenCode TUI dialog-provider.tsx](https://github.com/sst/opencode/blob/main/packages/opencode/src/cli/cmd/tui/component/dialog-provider.tsx)

## Priority

**High** - This bug prevents users from completing OAuth authentication flow in the TUI, forcing them to manually copy/reconstruct the URL or use the CLI instead.
