/**
 * OpenAI OAuth Configuration Constants
 * These are the official OAuth credentials used by the Codex CLI
 */

export const OAUTH_CONFIG = {
  clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
  authorizationUrl: "https://auth.openai.com/oauth/authorize",
  tokenUrl: "https://auth.openai.com/oauth/token",
  redirectUri: "http://localhost:1455/auth/callback",
  scopes: ["openid", "profile", "email", "offline_access"],
  audience: "https://api.openai.com/v1",
} as const

export const LOCAL_SERVER = {
  host: "0.0.0.0", // Bind to all interfaces for WSL2 compatibility
  port: 1455,
  callbackPath: "/auth/callback",
} as const

export const CODEX_API = {
  baseUrl: "https://chatgpt.com/backend-api",
  responsesEndpoint: "/codex/responses",
} as const

export const CODEX_HEADERS = {
  openAiBeta: "responses=experimental",
  originator: "codex_cli_rs",
  jwtClaimPath: "https://api.openai.com/auth",
} as const

export const PLUGIN_NAME = "openai-codex-auth"
export const PROVIDER_ID = "openai"
export const AUTH_LABEL = "ChatGPT Plus/Pro (Codex Subscription)"

/**
 * Timeout for OAuth polling (in milliseconds)
 * 60 seconds = 600 iterations * 100ms
 */
export const OAUTH_TIMEOUT_MS = 60000
export const OAUTH_POLL_INTERVAL_MS = 100
