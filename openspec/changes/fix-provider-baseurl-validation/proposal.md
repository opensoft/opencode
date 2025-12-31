# Change: Validate provider baseURL format before passing to SDK

## Why

When users misconfigure their `opencode.json` with an invalid `api` field (e.g., `"api": "anthropic"` instead of a URL), or when invalid values slip through the options merge chain, the SDK receives a malformed `baseURL`. The `@ai-sdk/*` SDKs use nullish coalescing (`??`) for defaults, which doesn't catch empty strings or non-URL values—causing cryptic `ERR_INVALID_URL` errors from `fetch()`.

## What Changes

- Add URL format validation before passing `baseURL` to provider SDKs
- Only set `baseURL` if it's a valid URL (starts with `http://` or `https://`)
- Delete invalid `baseURL` values so SDKs fall back to their hardcoded defaults

## Impact

- Affected code: `packages/opencode/src/provider/provider.ts`
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

### The Fix

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
