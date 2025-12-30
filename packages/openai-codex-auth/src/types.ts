/**
 * TypeScript type definitions for OpenAI Codex Auth Plugin
 */

export interface OAuthTokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  scope: string
  id_token?: string
}

export interface OAuthError {
  error: string
  error_description?: string
}

export interface PKCEChallenge {
  codeVerifier: string
  codeChallenge: string
  state: string
}

export interface AuthorizationResult {
  code: string
  state: string
}

export interface TokenInfo {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface DecodedJWT {
  sub?: string
  email?: string
  name?: string
  exp?: number
  iat?: number
}

export type AuthCallbackResult = {
  type: "success"
  refresh: string
  access: string
  expires: number
} | {
  type: "failed"
  error?: string
}
