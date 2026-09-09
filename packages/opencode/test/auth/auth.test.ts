import { describe, expect } from "bun:test"
import { LayerNode } from "@opencode-ai/core/effect/layer-node"
import { Global } from "@opencode-ai/core/global"
import { Effect } from "effect"
import path from "path"
import { Auth } from "../../src/auth"
import { testEffect } from "../lib/effect"

const it = testEffect(LayerNode.compile(Auth.node))

describe("Auth", () => {
  it.instance("set normalizes trailing slashes in keys", () =>
    Effect.gen(function* () {
      const auth = yield* Auth.Service
      yield* auth.set("https://example.com/", {
        type: "wellknown",
        key: "TOKEN",
        token: "abc",
      })
      const data = yield* auth.all()
      expect(data["https://example.com"]).toBeDefined()
      expect(data["https://example.com/"]).toBeUndefined()
    }),
  )

  it.instance("set cleans up pre-existing trailing-slash entry", () =>
    Effect.gen(function* () {
      const auth = yield* Auth.Service
      yield* auth.set("https://example.com/", {
        type: "wellknown",
        key: "TOKEN",
        token: "old",
      })
      yield* auth.set("https://example.com", {
        type: "wellknown",
        key: "TOKEN",
        token: "new",
      })
      const data = yield* auth.all()
      const keys = Object.keys(data).filter((key) => key.includes("example.com"))
      expect(keys).toEqual(["https://example.com"])
      const entry = data["https://example.com"]!
      expect(entry.type).toBe("wellknown")
      if (entry.type === "wellknown") expect(entry.token).toBe("new")
    }),
  )

  it.instance("remove deletes both trailing-slash and normalized keys", () =>
    Effect.gen(function* () {
      const auth = yield* Auth.Service
      yield* auth.set("https://example.com", {
        type: "wellknown",
        key: "TOKEN",
        token: "abc",
      })
      yield* auth.remove("https://example.com/")
      const data = yield* auth.all()
      expect(data["https://example.com"]).toBeUndefined()
      expect(data["https://example.com/"]).toBeUndefined()
    }),
  )

  it.instance("set and remove are no-ops on keys without trailing slashes", () =>
    Effect.gen(function* () {
      const auth = yield* Auth.Service
      yield* auth.set("anthropic", {
        type: "api",
        key: "sk-test",
      })
      const data = yield* auth.all()
      expect(data["anthropic"]).toBeDefined()
      yield* auth.remove("anthropic")
      const after = yield* auth.all()
      expect(after["anthropic"]).toBeUndefined()
    }),
  )

  it.instance("provider profile auth overrides only the selected provider", () =>
    Effect.gen(function* () {
      const auth = yield* Auth.Service
      const profileFile = path.join(Global.Path.data, "openai-profile-auth.json")
      process.env.OPENCODE_AUTH_PROFILE_PROVIDER = "openai"
      process.env.OPENCODE_AUTH_PROFILE_FILE = profileFile

      yield* auth.set("anthropic", { type: "api", key: "shared-key" })
      yield* auth.set("openai", {
        type: "oauth",
        refresh: "profile-refresh",
        access: "profile-access",
        expires: 1,
        accountId: "profile-account",
      })

      const data = yield* auth.all()
      expect(data.anthropic).toEqual({ type: "api", key: "shared-key" })
      expect(data.openai).toEqual({
        type: "oauth",
        refresh: "profile-refresh",
        access: "profile-access",
        expires: 1,
        accountId: "profile-account",
      })

      const shared = yield* Effect.promise(() => Bun.file(path.join(Global.Path.data, "auth.json")).json())
      expect(shared.anthropic).toEqual({ type: "api", key: "shared-key" })
      expect(shared.openai).toBeUndefined()
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          delete process.env.OPENCODE_AUTH_PROFILE_PROVIDER
          delete process.env.OPENCODE_AUTH_PROFILE_FILE
        }),
      ),
    ),
  )

  it.instance("missing profile auth hides the shared selected provider", () =>
    Effect.gen(function* () {
      const auth = yield* Auth.Service
      process.env.OPENCODE_AUTH_PROFILE_PROVIDER = "openai"
      process.env.OPENCODE_AUTH_PROFILE_FILE = path.join(Global.Path.data, "missing-profile-auth.json")

      yield* Effect.promise(() =>
        Bun.write(
          path.join(Global.Path.data, "auth.json"),
          JSON.stringify({
            openai: { type: "api", key: "shared-openai" },
            anthropic: { type: "api", key: "shared" },
          }),
        ),
      )
      const data = yield* auth.all()
      expect(data.openai).toBeUndefined()
      expect(data.anthropic).toEqual({ type: "api", key: "shared" })
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          delete process.env.OPENCODE_AUTH_PROFILE_PROVIDER
          delete process.env.OPENCODE_AUTH_PROFILE_FILE
        }),
      ),
    ),
  )
})
