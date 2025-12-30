/**
 * OpenAI Codex Auth Plugin for OpenCode
 *
 * Enables ChatGPT Plus/Pro subscribers to use OpenAI models via OAuth
 * Uses the same authentication flow as the official Codex CLI
 */

import type { Plugin, AuthHook, AuthOuathResult } from "@opencode-ai/plugin"
import { initiateOAuthFlow, refreshAccessToken } from "./auth/auth"
import { PROVIDER_ID, AUTH_LABEL } from "./constants"
import { isTokenExpired } from "./request/fetch-helpers"

/**
 * OpenAI Codex Authentication Plugin
 *
 * Provides OAuth authentication for OpenAI API access using
 * ChatGPT Plus/Pro subscription credentials.
 */
export const OpenAICodexAuthPlugin: Plugin = async (_ctx) => {
  const authHook: AuthHook = {
    provider: PROVIDER_ID,

    /**
     * Loader function called when the provider needs authentication
     * Handles token refresh and returns SDK options
     */
    loader: async (getAuth, _provider) => {
      const auth = await getAuth()

      if (auth.type !== "oauth") {
        return {}
      }

      // Check if token needs refresh
      if (isTokenExpired(auth.expires)) {
        try {
          const tokens = await refreshAccessToken(auth.refresh)
          const newExpires = Date.now() + tokens.expires_in * 1000

          // Return refreshed credentials
          // Note: The opencode system will handle persisting these
          return {
            apiKey: tokens.access_token,
            _refreshedAuth: {
              type: "oauth" as const,
              access: tokens.access_token,
              refresh: tokens.refresh_token,
              expires: newExpires,
            },
          }
        } catch (error) {
          console.error("[openai-codex-auth] Failed to refresh token:", error)
          // Return existing token and let the API call fail if it's truly expired
          return {
            apiKey: auth.access,
          }
        }
      }

      return {
        apiKey: auth.access,
      }
    },

    methods: [
      {
        type: "oauth",
        label: AUTH_LABEL,

        /**
         * Initiate the OAuth flow
         */
        authorize: async (_inputs?: Record<string, string>): Promise<AuthOuathResult> => {
          const flow = await initiateOAuthFlow()

          return {
            url: flow.url,
            instructions: flow.instructions,
            method: "auto" as const,
            callback: async () => {
              const result = await flow.callback()

              if (result.type === "failed") {
                return { type: "failed" as const }
              }

              return {
                type: "success" as const,
                refresh: result.refresh,
                access: result.access,
                expires: result.expires,
              }
            },
          }
        },
      },
    ],
  }

  return {
    auth: authHook,
  }
}

// Default export for compatibility
export default OpenAICodexAuthPlugin
