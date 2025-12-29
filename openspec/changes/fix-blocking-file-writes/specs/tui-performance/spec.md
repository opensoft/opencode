# TUI Performance

## MODIFIED Requirements

### Requirement: Non-blocking state persistence

The TUI SHALL persist state (KV store, model preferences) without blocking the main render thread.

**Rationale**: Synchronous file writes cause UI freezes that degrade user experience.

#### Scenario: KV store write does not block UI

**Given** the user changes a setting in the TUI
**When** the KV store persists the change to disk
**Then** the UI remains responsive during the write operation
**And** write errors are silently handled

#### Scenario: Model preference write does not block UI

**Given** the user selects a model or toggles a favorite
**When** the model store persists the change to disk
**Then** the UI remains responsive during the write operation
**And** write errors are silently handled
