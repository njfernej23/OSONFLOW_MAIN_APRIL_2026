"use node"

import vm from "node:vm"
import { v } from "convex/values"

import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import {
  asString,
  isRecord,
  type RuntimeVariables,
} from "../lib/workflowEngine"

const SNIPPET_TIMEOUT_MS = 2_000
const MAX_CODE_CHARS = 20_000
const MAX_LOGS = 25
const MAX_VALUE_CHARS = 10_000

export type JsStepResult = {
  ok: boolean
  variables: RuntimeVariables
  logs: string[]
  /** Path name the snippet asked for, from `return { next }`. */
  next?: string
  error?: string
}

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "string") {
    return value.slice(0, MAX_VALUE_CHARS)
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  try {
    return JSON.stringify(value).slice(0, MAX_VALUE_CHARS)
  } catch {
    return String(value).slice(0, MAX_VALUE_CHARS)
  }
}

/**
 * Runs a workflow author's snippet in a bare V8 context.
 *
 * The context is created empty, so the snippet sees only the standard
 * ECMAScript globals plus `variables` and `console` — no require, process,
 * fetch, or timers. Code generation is disabled so the snippet cannot eval its
 * way out, and execution is capped by a wall-clock timeout.
 *
 * This is a workflow-author trust boundary, not an untrusted-code sandbox:
 * whoever can edit a published workflow can already point an API block at any
 * URL. It is deliberately no more privileged than that.
 */
export const executeSnippet = (
  code: string,
  variables: RuntimeVariables
): JsStepResult => {
  const source = code.slice(0, MAX_CODE_CHARS).trim()

  if (!source) {
    return { ok: true, variables: {}, logs: [], error: undefined }
  }

  const logs: string[] = []
  const scoped: Record<string, unknown> = { ...variables }

  const sandbox: Record<string, unknown> = {
    variables: scoped,
    console: {
      log: (...args: unknown[]) => {
        if (logs.length < MAX_LOGS) {
          logs.push(args.map(stringifyValue).join(" "))
        }
      },
    },
  }

  try {
    const context = vm.createContext(sandbox, {
      codeGeneration: { strings: false, wasm: false },
    })
    const script = new vm.Script(
      `"use strict";(function(){${source}\n})()`
    )
    const returned = script.runInContext(context, {
      timeout: SNIPPET_TIMEOUT_MS,
      displayErrors: true,
    })

    const next: RuntimeVariables = {}

    // Anything the snippet assigned onto `variables`...
    for (const [key, value] of Object.entries(scoped)) {
      if (variables[key] !== stringifyValue(value)) {
        next[key] = stringifyValue(value)
      }
    }

    let chosenPath: string | undefined

    // ...plus anything it returned. `{ next, outputs }` picks a Function path;
    // any other object is treated as plain outputs.
    if (isRecord(returned)) {
      const hasPathShape =
        typeof returned.next === "string" || isRecord(returned.outputs)

      if (hasPathShape) {
        chosenPath =
          typeof returned.next === "string" ? returned.next.trim() : undefined

        if (isRecord(returned.outputs)) {
          for (const [key, value] of Object.entries(returned.outputs)) {
            next[key] = stringifyValue(value)
          }
        }
      } else {
        for (const [key, value] of Object.entries(returned)) {
          next[key] = stringifyValue(value)
        }
      }
    }

    return { ok: true, variables: next, logs, next: chosenPath }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "JavaScript step failed."

    return { ok: false, variables: {}, logs, error: message }
  }
}

/** Standalone execution used by the builder's Run panel preview. */
export const runSnippet = internalAction({
  args: {
    code: v.string(),
    variables: v.any(),
  },
  returns: v.object({
    ok: v.boolean(),
    variables: v.any(),
    logs: v.array(v.string()),
    next: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (_ctx, args) =>
    executeSnippet(
      args.code,
      (isRecord(args.variables) ? args.variables : {}) as RuntimeVariables
    ),
})

export const runNode = internalAction({
  args: {
    sessionId: v.id("workflowSessions"),
    conversationId: v.id("conversations"),
    nodeId: v.string(),
  },
  returns: v.object({ ok: v.boolean(), error: v.optional(v.string()) }),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.system.workflowApiSteps.getStepContext,
      {
        sessionId: args.sessionId,
        conversationId: args.conversationId,
        nodeId: args.nodeId,
      }
    )

    if (!context) {
      return { ok: false, error: "Session not ready for JavaScript step" }
    }

    const data = isRecord(context.nodeData) ? context.nodeData : {}
    const isFunction = context.nodeType === "function"
    const result = executeSnippet(
      asString(data.code),
      context.variables as RuntimeVariables
    )

    let handle: string | undefined
    let handleLabel: string | undefined
    let error = result.error

    if (isFunction) {
      const paths = (Array.isArray(data.paths) ? data.paths : [])
        .filter(isRecord)
        .map((path) => ({
          id: asString(path.id),
          name: asString(path.name).trim(),
        }))
        .filter((path) => path.id !== "")

      if (result.ok) {
        const chosen = result.next
          ? paths.find((path) => path.name === result.next)
          : undefined

        if (result.next && !chosen) {
          error = `No path named "${result.next}"; took the first one instead.`
        }

        const taken = chosen ?? paths[0]
        handle = taken?.id
        handleLabel = taken?.name
      } else {
        // A thrown snippet takes an "error" path when the author declared one.
        const errorPath = paths.find((path) => path.name === "error")
        handle = errorPath?.id
        handleLabel = errorPath?.name ?? "error (no path declared)"
      }
    }

    await ctx.runMutation(internal.system.workflowRuntime.continueAfterAction, {
      sessionId: args.sessionId,
      conversationId: args.conversationId,
      nodeId: args.nodeId,
      kind: isFunction ? "function" : "javascript",
      ok: result.ok,
      status: result.ok ? 200 : 0,
      resultVariables: result.variables,
      handle,
      handleLabel,
      error,
    })

    return { ok: result.ok, error }
  },
})
