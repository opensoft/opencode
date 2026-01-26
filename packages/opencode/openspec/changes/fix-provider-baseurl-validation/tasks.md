# Tasks

## Phase 1: Runtime Validation

### 1.1 Implementation

- [x] 1.1.1 Add `isValidUrl` helper function to validate URL format
- [x] 1.1.2 Replace falsy check with URL format validation
- [x] 1.1.3 Delete invalid baseURL before conditionally setting from model.api.url

### 1.2 Testing

- [x] 1.2.1 Verify fix compiles (typecheck passes)
- [x] 1.2.2 Manual test with Anthropic provider
- [x] 1.2.3 Confirm SDK uses default URL when invalid baseURL is filtered

### 1.3 Documentation

- [x] 1.3.1 Create openspec proposal documenting the issue
- [ ] 1.3.2 Submit PR with clear description

## Phase 2: Config-Time Validation

### 2.1 Design

- [x] 2.1.1 Research how config validation works (Zod schemas in config.ts)
- [x] 2.1.2 Research models.dev data structure and caching
- [x] 2.1.3 Design hybrid validation strategy (models.dev + URL fallback)
- [x] 2.1.4 Document validation flow diagram

### 2.2 Implementation

- [x] 2.2.1 Add `validateProviderConfig()` function to config.ts
- [x] 2.2.2 Implement models.dev cache lookup for validation
- [x] 2.2.3 Implement URL format fallback validation
- [x] 2.2.4 Integrate validation into `loadFile()` after Zod parse
- [x] 2.2.5 Add clear error messages with hints

### 2.3 Testing

- [x] 2.3.1 Test with invalid `api` value (e.g., `"anthropic"`)
- [x] 2.3.2 Test with empty string `api` value
- [x] 2.3.3 Test with valid URL `api` value
- [x] 2.3.4 Test fallback when models.dev cache unavailable
- [x] 2.3.5 Verify error messages are helpful

### 2.4 Documentation

- [x] 2.4.1 Update proposal with implementation details
- [x] 2.4.2 Update spec with config validation requirements

---

## Validation Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Config Validation Flow                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Load config file (JSONC parse)                       │
│                     │                                    │
│                     ▼                                    │
│  2. Zod schema validation (Info.safeParse)               │
│                     │                                    │
│                     ▼                                    │
│  3. Post-validation hook (NEW)                           │
│     ┌───────────────┴───────────────┐                   │
│     │                               │                    │
│     ▼                               ▼                    │
│  Try models.dev cache         Cache unavailable?         │
│     │                               │                    │
│     ▼                               ▼                    │
│  Validate against              URL format check          │
│  known providers               (http/https prefix)       │
│     │                               │                    │
│     └───────────────┬───────────────┘                   │
│                     ▼                                    │
│  4. Return validated config or throw error               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  opencode.json   │     │   models.dev     │     │   Provider SDK   │
│                  │     │   (cached)       │     │                  │
│  provider:       │     │                  │     │  baseURL:        │
│    anthropic:    │     │  anthropic:      │     │    ?? default    │
│      api: ???    │────▶│    api: null     │────▶│                  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
   User Config             Reference Data            Runtime Check
   (may be wrong)          (what's valid)            (last defense)
```
