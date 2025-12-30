/**
 * Cross-platform browser launching utility
 */

import { spawn } from "child_process"

/**
 * Opens a URL in the default system browser
 */
export async function openBrowser(url: string): Promise<void> {
  const platform = process.platform

  let command: string
  let args: string[]

  switch (platform) {
    case "darwin":
      command = "open"
      args = [url]
      break
    case "win32":
      command = "cmd"
      args = ["/c", "start", "", url]
      break
    default:
      // Linux and others
      command = "xdg-open"
      args = [url]
      break
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    })

    child.on("error", (err) => {
      reject(new Error(`Failed to open browser: ${err.message}`))
    })

    child.unref()
    resolve()
  })
}
