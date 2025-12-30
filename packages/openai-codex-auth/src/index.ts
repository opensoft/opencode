/**
 * OpenAI Codex Auth Plugin for OpenCode
 *
 * Enables ChatGPT Plus/Pro subscribers to use OpenAI models via OAuth
 * Uses the same authentication flow as the official Codex CLI
 */

import type { Plugin, AuthHook, AuthOuathResult } from "@opencode-ai/plugin"
import { initiateOAuthFlow, refreshAccessToken } from "./auth/auth"
import { PROVIDER_ID, AUTH_LABEL, CODEX_API, CODEX_HEADERS } from "./constants"
import { isTokenExpired, extractAccountId } from "./request/fetch-helpers"
import { CODEX_SYSTEM_PROMPT } from "./codex-prompt"

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
     * Handles token refresh and returns SDK options for Codex backend
     */
    loader: async (getAuth, _provider) => {
      const auth = await getAuth()

      if (auth.type !== "oauth") {
        return {}
      }

      /**
       * Custom fetch that rewrites URLs and transforms request body for the Codex backend
       * The SDK sends to /responses but Codex expects /codex/responses
       * Codex also requires an 'instructions' field in the request body
       */
      const codexFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url

        // Rewrite /responses to /codex/responses for the Codex backend
        if (url.includes("/responses") && !url.includes("/codex/responses")) {
          url = url.replace("/responses", "/codex/responses")
        }

        // Transform request body for Codex backend requirements
        let modifiedInit = init
        if (init?.body && typeof init.body === "string") {
          try {
            const body = JSON.parse(init.body)

            // Required by ChatGPT backend
            body.store = false
            body.stream = true

            // Remove any system messages from input - Codex backend handles instructions differently
            if (body.input && Array.isArray(body.input)) {
              body.input = body.input.filter((item: { role?: string }) => item.role !== "system")
            }

            // Delete any existing instructions - backend will use model-specific defaults
            // DO NOT set instructions manually - backend validates them strictly
            delete body.instructions

            // Strip item IDs for stateless operation (required by Codex backend)
            if (body.input && Array.isArray(body.input)) {
              body.input = body.input.map((item: Record<string, unknown>) => {
                const { id, ...rest } = item
                return rest
              })
            }

            modifiedInit = {
              ...init,
              body: JSON.stringify(body),
            }
          } catch {
            // If body isn't JSON, pass through unchanged
          }
        }

        return fetch(url, modifiedInit)
      }

      /**
       * Build SDK options with Codex backend configuration
       */
      const buildOptions = (accessToken: string, refreshedAuth?: object) => {
        const accountId = extractAccountId(accessToken)
        const headers: Record<string, string> = {
          "OpenAI-Beta": CODEX_HEADERS.openAiBeta,
          originator: CODEX_HEADERS.originator,
        }
        if (accountId) {
          headers["chatgpt-account-id"] = accountId
        }

        return {
          apiKey: accessToken,
          baseURL: CODEX_API.baseUrl,
          headers,
          fetch: codexFetch,
          ...(refreshedAuth ? { _refreshedAuth: refreshedAuth } : {}),
        }
      }

      // Check if token needs refresh
      if (isTokenExpired(auth.expires)) {
        try {
          const tokens = await refreshAccessToken(auth.refresh)
          const newExpires = Date.now() + tokens.expires_in * 1000

          return buildOptions(tokens.access_token, {
            type: "oauth" as const,
            access: tokens.access_token,
            refresh: tokens.refresh_token,
            expires: newExpires,
          })
        } catch (error) {
          console.error("[openai-codex-auth] Failed to refresh token:", error)
          // Return existing token and let the API call fail if it's truly expired
          return buildOptions(auth.access)
        }
      }

      return buildOptions(auth.access)
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
