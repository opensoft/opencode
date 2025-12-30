/**
 * Core OAuth implementation with PKCE
 */

import { randomBytes, createHash } from "crypto"
import { OAUTH_CONFIG } from "../constants"
import type { PKCEChallenge, OAuthTokenResponse, OAuthError, AuthCallbackResult } from "../types"
import { openBrowser } from "./browser"
import { startCallbackServer } from "./server"

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  return randomBytes(length).toString("base64url").slice(0, length)
}

/**
 * Create a SHA256 hash and return as base64url
 */
function sha256(input: string): string {
  return createHash("sha256").update(input).digest("base64url")
}

/**
 * Generate PKCE challenge (code_verifier and code_challenge)
 */
export function createPKCEChallenge(): PKCEChallenge {
  // Generate a random 43-128 character code verifier
  const codeVerifier = generateRandomString(64)
  // Create the code challenge using S256 method
  const codeChallenge = sha256(codeVerifier)
  // Generate state for CSRF protection
  const state = generateRandomString(32)

  return {
    codeVerifier,
    codeChallenge,
    state,
  }
}

/**
 * Build the authorization URL with PKCE parameters
 */
export function buildAuthorizationUrl(pkce: PKCEChallenge): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    response_type: "code",
    scope: OAUTH_CONFIG.scopes.join(" "),
    state: pkce.state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: "S256",
    audience: OAUTH_CONFIG.audience,
  })

  return `${OAUTH_CONFIG.authorizationUrl}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<OAuthTokenResponse> {
  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: OAUTH_CONFIG.clientId,
      code,
      redirect_uri: OAUTH_CONFIG.redirectUri,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const error = (await response.json()) as OAuthError
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`)
  }

  return response.json() as Promise<OAuthTokenResponse>
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
  const response = await fetch(OAUTH_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: OAUTH_CONFIG.clientId,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    const error = (await response.json()) as OAuthError
    throw new Error(`Token refresh failed: ${error.error_description || error.error}`)
  }

  return response.json() as Promise<OAuthTokenResponse>
}

/**
 * Decode a JWT token to extract claims (without verification)
 */
export function decodeJWT(token: string): Record<string, unknown> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      return {}
    }
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8")
    return JSON.parse(payload)
  } catch {
    return {}
  }
}

/**
 * Perform the complete OAuth flow
 * Returns authorization URL and callback handler
 */
export async function initiateOAuthFlow(): Promise<{
  url: string
  instructions: string
  method: "auto"
  callback: () => Promise<AuthCallbackResult>
}> {
  const pkce = createPKCEChallenge()
  const authUrl = buildAuthorizationUrl(pkce)

  // Start the callback server before returning
  const callbackPromise = startCallbackServer(pkce.state)

  return {
    url: authUrl,
    instructions: "Complete the authentication in your browser. You will be redirected back automatically.",
    method: "auto" as const,
    callback: async (): Promise<AuthCallbackResult> => {
      try {
        // Open browser
        await openBrowser(authUrl)

        // Wait for callback
        const result = await callbackPromise

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(result.code, pkce.codeVerifier)

        // Calculate expiry time
        const expiresAt = Date.now() + tokens.expires_in * 1000

        return {
          type: "success",
          refresh: tokens.refresh_token,
          access: tokens.access_token,
          expires: expiresAt,
        }
      } catch (error) {
        return {
          type: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    },
  }
}
