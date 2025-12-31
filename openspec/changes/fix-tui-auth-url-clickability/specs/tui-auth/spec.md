# TUI Authentication URL Display

## ADDED Requirements

### Requirement: Clickable Auth URLs

The TUI MUST render OAuth authorization URLs as clickable elements so that clicking anywhere on the URL text opens it in the default browser, regardless of visual line wrapping.

#### Scenario: User clicks wrapped OAuth URL

**Given** the user is in the TUI auth dialog for Anthropic Claude Pro/Max
**And** the OAuth authorization URL is longer than the dialog width
**And** the URL wraps across multiple lines visually
**When** the user clicks on any part of the displayed URL
**Then** the entire URL MUST be opened in the default browser
**And** the URL MUST be complete and valid (not truncated at line breaks)

### Requirement: Link Component for TUI

A new `Link` component MUST be created in the TUI UI library that:
- Accepts `href` (URL) and optional display text via `children` prop
- Supports foreground color styling via `fg` prop
- Opens the URL in the default browser when clicked (using `onMouseUp` handler)
- Works in all terminal emulators (not dependent on OSC 8 support)

#### Scenario: Link component renders clickable hyperlink

**Given** a `Link` component with `href="https://example.com"` and `children="Click here"`
**When** the component is rendered in the terminal
**And** the user clicks on the text
**Then** the URL "https://example.com" MUST be opened in the default browser
**And** the text "Click here" MUST be displayed with the specified foreground color

## MODIFIED Requirements

### Requirement: Update CodeMethod URL Display

The `CodeMethod` component in `dialog-provider.tsx` MUST use the new `Link` component instead of plain `<text>` for displaying the authorization URL.

#### Scenario: CodeMethod displays clickable URL

**Given** the user selects "Claude Pro/Max" OAuth authentication
**When** the CodeMethod dialog is displayed
**Then** the authorization URL should be rendered using the `Link` component
**And** the URL should be fully clickable regardless of line wrapping

### Requirement: Update AutoMethod URL Display

The `AutoMethod` component in `dialog-provider.tsx` MUST use the new `Link` component instead of plain `<text>` for displaying the authorization URL.

#### Scenario: AutoMethod displays clickable URL

**Given** the user selects an OAuth method with auto-callback
**When** the AutoMethod dialog is displayed
**Then** the authorization URL should be rendered using the `Link` component
**And** the URL should be fully clickable regardless of line wrapping
