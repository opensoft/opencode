## ADDED Requirements

### Requirement: Provider baseURL Runtime Validation (Phase 1)

The system SHALL validate that `baseURL` values passed to provider SDKs are valid URLs (starting with `http://` or `https://`). Invalid or empty values SHALL be removed so the SDK can use its default endpoint.

#### Scenario: User misconfigures api field with provider name

- **WHEN** user sets `"api": "anthropic"` in config instead of a URL
- **THEN** the invalid value is filtered out
- **AND** the SDK uses its default baseURL (`https://api.anthropic.com/v1`)

#### Scenario: baseURL is empty string

- **WHEN** baseURL is set to empty string `""`
- **THEN** the empty value is deleted from options
- **AND** the SDK uses its default baseURL

#### Scenario: baseURL is null from models.dev

- **WHEN** models.dev API returns `"api": null` for a provider
- **THEN** the null value does not override SDK defaults
- **AND** the SDK uses its hardcoded default baseURL

#### Scenario: Valid baseURL is preserved

- **WHEN** baseURL is a valid URL like `"https://custom-proxy.example.com/v1"`
- **THEN** the URL is passed to the SDK unchanged
- **AND** the SDK uses the custom baseURL

---

### Requirement: Provider Config Validation at Load Time (Phase 2)

The system SHALL validate provider configuration fields when loading `opencode.json`, using a hybrid validation strategy that validates against models.dev data when available and falls back to URL format validation otherwise.

#### Scenario: Validate against models.dev data (primary)

- **GIVEN** models.dev cache is available at `~/.cache/opencode/models.json`
- **WHEN** config contains a provider with an `api` field
- **THEN** the system validates the `api` value against the expected format for that provider
- **AND** rejects values that don't match (e.g., `"anthropic"` instead of a URL)

#### Scenario: Fallback to URL format validation

- **GIVEN** models.dev cache is NOT available
- **WHEN** config contains a provider with an `api` field
- **THEN** the system validates that `api` starts with `http://` or `https://`
- **AND** rejects obviously invalid values like `"anthropic"` or `""`

#### Scenario: Clear error message on validation failure

- **WHEN** config validation fails due to invalid `api` value
- **THEN** the error message SHALL include:
  - The exact field path (e.g., `provider.anthropic.api`)
  - The invalid value that was provided
  - A hint explaining valid options (URL or omit field)

#### Scenario: Valid config passes validation

- **WHEN** config contains valid provider configuration
- **AND** `api` field is either omitted, null, or a valid URL
- **THEN** validation passes without error
- **AND** config is loaded normally

---

## Validation Flow

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
│  3. Post-validation hook                                 │
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

## Defense in Depth

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Layer 1   │     │   Layer 2   │     │   Layer 3   │
│  Config     │────▶│  Runtime    │────▶│  SDK        │
│  Validation │     │  Validation │     │  Defaults   │
│  (Phase 2)  │     │  (Phase 1)  │     │  (Fallback) │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
   Catch at            Catch at            Last
   load time           runtime             resort
```
