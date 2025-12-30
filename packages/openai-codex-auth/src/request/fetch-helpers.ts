/**
 * Fetch helpers for token management and API requests
 */

import { refreshAccessToken } from "../auth/auth"
import { CODEX_API, CODEX_HEADERS } from "../constants"

export interface TokenManager {
  accessToken: string
  refreshToken: string
  expiresAt: number
  onTokenRefresh?: (tokens: { access: string; refresh: string; expires: number }) => void
}

/**
 * Check if the access token is expired or about to expire
 * Considers token expired if it expires within 5 minutes
 */
export function isTokenExpired(expiresAt: number): boolean {
  const bufferMs = 5 * 60 * 1000 // 5 minutes
  return Date.now() >= expiresAt - bufferMs
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(manager: TokenManager): Promise<string> {
  if (!isTokenExpired(manager.expiresAt)) {
    return manager.accessToken
  }

  // Token is expired, refresh it
  const tokens = await refreshAccessToken(manager.refreshToken)
  const newExpiresAt = Date.now() + tokens.expires_in * 1000

  // Update manager
  manager.accessToken = tokens.access_token
  manager.refreshToken = tokens.refresh_token
  manager.expiresAt = newExpiresAt

  // Notify callback if provided
  if (manager.onTokenRefresh) {
    manager.onTokenRefresh({
      access: tokens.access_token,
      refresh: tokens.refresh_token,
      expires: newExpiresAt,
    })
  }

  return tokens.access_token
}

/**
 * Decode a JWT token and extract claims (without verification)
 */
export function decodeJWT(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return {}
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decoded)
  } catch {
    return {}
  }
}

/**
 * Extract ChatGPT account ID from JWT token
 */
export function extractAccountId(accessToken: string): string | undefined {
  const claims = decodeJWT(accessToken)
  const authClaims = claims[CODEX_HEADERS.jwtClaimPath] as Record<string, unknown> | undefined
  return authClaims?.["organization_id"] as string | undefined
}

/**
 * Create authorization headers for Codex API requests
 */
export function createAuthHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": CODEX_HEADERS.openAiBeta,
    originator: CODEX_HEADERS.originator,
  }

  // Extract and add account ID from JWT if available
  const accountId = extractAccountId(accessToken)
  if (accountId) {
    headers["chatgpt-account-id"] = accountId
  }

  return headers
}

/**
 * Make an authenticated API request to OpenAI
 */
export async function authenticatedFetch(
  manager: TokenManager,
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getValidAccessToken(manager)

  const url = endpoint.startsWith("http") ? endpoint : `${CODEX_API.baseUrl}${endpoint}`

  return fetch(url, {
    ...options,
    headers: {
      ...createAuthHeaders(accessToken),
      ...options.headers,
    },
  })
}
