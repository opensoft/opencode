# Change: Validate provider baseURL format before passing to SDK

## Why

When users misconfigure their `opencode.json` with an invalid `api` field (e.g., `"api": "anthropic"` instead of a URL), or when invalid values slip through the options merge chain, the SDK receives a malformed `baseURL`. The `@ai-sdk/*` SDKs use nullish coalescing (`??`) for defaults, which doesn't catch empty strings or non-URL values—causing cryptic `ERR_INVALID_URL` errors from `fetch()`.

## What Changes

### Phase 1: Runtime Validation (Complete)

- Add URL format validation before passing `baseURL` to provider SDKs
- Only set `baseURL` if it's a valid URL (starts with `http://` or `https://`)
- Delete invalid `baseURL` values so SDKs fall back to their hardcoded defaults

### Phase 2: Config-Time Validation (Planned)

- Add validation at config load time to catch invalid values early
- Hybrid approach: validate against models.dev data when available, fall back to URL format check
- Provide clear error messages pointing users to the exact config issue

## Impact

- Affected code:
  - Phase 1: `packages/opencode/src/provider/provider.ts`
  - Phase 2: `packages/opencode/src/config/config.ts`
- Risk: Low - only filters out invalid URLs, cannot break valid configurations
- User benefit: Clear failure mode instead of cryptic fetch errors

## Root Cause Analysis

### The Problem

The `@ai-sdk/anthropic` SDK (and others) construct their baseURL like this:

```javascript
const baseURL = withoutTrailingSlash(loadOptionalSetting({
  settingValue: options.baseURL,
  environmentVariableName: "ANTHROPIC_BASE_URL"
})) ?? "https://api.anthropic.com/v1";
```

The `??` operator only catches `null`/`undefined`. If `baseURL` is:
- Empty string `""`
- Invalid value like `"anthropic"`

...it bypasses the default and causes `fetch()` to fail with `ERR_INVALID_URL`.

### How Invalid Values Reach the SDK

1. **User config misconfiguration**: `"api": "anthropic"` instead of a URL
2. **models.dev API**: Returns `"api": null` for some providers
3. **Options merge chain**: Various sources merged without validation

## Phase 1: Runtime Fix (Complete)

```typescript
const isValidUrl = (url: string | undefined | null): url is string => {
  return typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))
}
if (!isValidUrl(options["baseURL"])) {
  delete options["baseURL"]
  if (isValidUrl(model.api.url)) options["baseURL"] = model.api.url
}
```

This ensures only valid URLs reach the SDK; otherwise, the SDK uses its default.

## Phase 2: Config-Time Validation Design

### Validation Flow

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

### Hybrid Validation Strategy

**Primary: Validate against models.dev data**

When models.dev cache is available (`~/.cache/opencode/models.json`):
- Check if provider `api` field matches expected format for known providers
- Known providers with dedicated SDKs (anthropic, openai, groq) expect `null` or valid URL
- Other providers from models.dev show what valid `api` URLs look like

**Fallback: URL format validation**

When models.dev cache is unavailable:
- If `api` field is set, validate it starts with `http://` or `https://`
- Reject obviously invalid values like `"anthropic"`, `""`, or random strings

### What models.dev Returns

| Provider Type | `api` Field Value |
|---------------|-------------------|
| SDK-based (anthropic, openai) | `null` or not set |
| URL-based (moonshot, nvidia) | `"https://api.example.com/v1"` |

### Implementation Location

Post-validation in `Config.loadFile()` after `Info.safeParse()`:

```typescript
// After line 963: const parsed = Info.safeParse(data)
if (parsed.success && parsed.data.provider) {
  await validateProviderConfig(parsed.data.provider)
}
```

### Error Messages

```
Config validation error at opencode.json:
  provider.anthropic.api: Invalid value "anthropic"
  Expected: Valid URL (https://...) or omit to use SDK default

  Hint: Remove the "api" field to use the default Anthropic endpoint,
        or provide a valid proxy URL like "https://my-proxy.com/v1"
```
