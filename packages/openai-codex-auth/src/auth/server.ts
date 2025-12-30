/**
 * Local OAuth callback server
 * Listens on localhost for the OAuth redirect
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from "http"
import { LOCAL_SERVER } from "../constants"
import type { AuthorizationResult } from "../types"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Starts a local HTTP server to receive the OAuth callback
 * Returns a promise that resolves with the authorization code
 */
export function startCallbackServer(expectedState: string): Promise<AuthorizationResult> {
  return new Promise((resolve, reject) => {
    let server: Server | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (server) {
        server.close()
        server = null
      }
    }

    // 60 second timeout
    timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error("OAuth callback timeout - no response received within 60 seconds"))
    }, 60000)

    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || "", `http://${LOCAL_SERVER.host}:${LOCAL_SERVER.port}`)

      if (url.pathname === LOCAL_SERVER.callbackPath) {
        const code = url.searchParams.get("code")
        const state = url.searchParams.get("state")
        const error = url.searchParams.get("error")
        const errorDescription = url.searchParams.get("error_description")

        if (error) {
          // Serve error page
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Failed</title></head>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1>Authentication Failed</h1>
                  <p>${errorDescription || error}</p>
                  <p>You can close this window.</p>
                </div>
              </body>
            </html>
          `)
          cleanup()
          reject(new Error(`OAuth error: ${errorDescription || error}`))
          return
        }

        if (!code || !state) {
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Invalid Request</title></head>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1>Invalid Request</h1>
                  <p>Missing authorization code or state parameter.</p>
                </div>
              </body>
            </html>
          `)
          cleanup()
          reject(new Error("Invalid OAuth callback - missing code or state"))
          return
        }

        if (state !== expectedState) {
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end(`
            <!DOCTYPE html>
            <html>
              <head><title>Security Error</title></head>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                <div style="text-align: center;">
                  <h1>Security Error</h1>
                  <p>State parameter mismatch. This could be a CSRF attack.</p>
                </div>
              </body>
            </html>
          `)
          cleanup()
          reject(new Error("OAuth state mismatch - possible CSRF attack"))
          return
        }

        // Success! Serve success page
        let successHtml: string
        try {
          successHtml = readFileSync(join(__dirname, "../../assets/oauth-success.html"), "utf-8")
        } catch {
          successHtml = `
            <!DOCTYPE html>
            <html>
              <head><title>Authentication Successful</title></head>
              <body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #10a37f 0%, #1a7f64 100%);">
                <div style="text-align: center; color: white;">
                  <h1>Authentication Successful!</h1>
                  <p>You can close this window and return to the terminal.</p>
                </div>
              </body>
            </html>
          `
        }

        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(successHtml)

        cleanup()
        resolve({ code, state })
      } else {
        res.writeHead(404)
        res.end("Not found")
      }
    })

    server.on("error", (err: NodeJS.ErrnoException) => {
      cleanup()
      if (err.code === "EADDRINUSE") {
        reject(new Error(`Port ${LOCAL_SERVER.port} is already in use. Please stop any other OAuth servers.`))
      } else {
        reject(err)
      }
    })

    server.listen(LOCAL_SERVER.port, LOCAL_SERVER.host, () => {
      // Server is ready
    })
  })
}
