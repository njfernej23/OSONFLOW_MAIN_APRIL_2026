/**
 * AI setup: turn a website address into a working assistant.
 *
 * The flow is deliberately three steps rather than one button, because the
 * useful half of a setup is the part a website never states - opening hours a
 * clinic keeps off its site, whether a school takes instalments, the one thing
 * the owner never wants said. So: read the site, ask the owner a short list of
 * questions the site could not answer, then write the setup from both.
 *
 * Nothing here publishes. Everything lands in the widget draft the owner
 * already reviews before going live.
 */
import { ConvexError, v } from "convex/values"
import { generateObject } from "ai"
import { z } from "zod"

import { contentHashFromArrayBuffer } from "@convex-dev/rag"

import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "../_generated/server"
import { internal } from "../_generated/api"
import type { Doc, Id } from "../_generated/dataModel"
import rag from "../system/ai/rag"
import { BUILTIN_ASSISTANT_TOOLS } from "../lib/assistantTools"
import { requireOrganizationIdentity } from "../lib/organizationIdentity"
import { enforceRateLimit } from "../lib/rateLimits"
import {
  OPENAI_CHAT_MODEL,
  getOpenAIChatModelFromSecretValue,
} from "../lib/openai"
import { buildCorpus, crawlSite } from "../lib/siteCrawl"

/** Setup writes prose the owner will read and edit, so it is worth the better model. */
const SETUP_MODEL = "gpt-4o"

const MAX_ANSWER_LENGTH = 2_000

/* ── shapes the model must return ───────────────────────────────────────── */

const siteProfileSchema = z.object({
  businessName: z.string(),
  summary: z.string(),
  industry: z.string(),
  languages: z.array(z.string()),
  topics: z.array(z.string()),
  keyFacts: z.array(z.string()),
  gaps: z.array(z.string()),
  questions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        why: z.string(),
        placeholder: z.string(),
      })
    )
    .min(2)
    .max(5),
})

const planSchema = z.object({
  systemPrompt: z.string(),
  greetMessage: z.string(),
  assistantName: z.string(),
  suggestion1: z.string(),
  suggestion2: z.string(),
  suggestion3: z.string(),
  homeGreeting: z.string(),
  homeHeadline: z.string(),
  inputPlaceholder: z.string(),
  primaryColor: z.string(),
  helpTopics: z.array(
    z.object({
      title: z.string(),
      excerpt: z.string(),
      articles: z.array(
        z.object({
          title: z.string(),
          excerpt: z.string(),
          body: z.string(),
        })
      ),
    })
  ),
  tools: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      type: z.enum(["google_sheets", "api_request", "custom_webhook"]),
      parameters: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          type: z.enum(["string", "number", "boolean"]),
          required: z.boolean(),
        })
      ),
      rationale: z.string(),
    })
  ),
  knowledgeDocs: z.array(
    z.object({
      title: z.string(),
      body: z.string(),
      sourceUrl: z.string().optional(),
    })
  ),
})

const HEX_COLOR = /^#[0-9a-f]{6}$/i

/* ── internal reads and writes ──────────────────────────────────────────── */

export const getRunInternal = internalQuery({
  args: { runId: v.id("aiSetupRuns") },
  handler: async (ctx, args) => await ctx.db.get(args.runId),
})

export const createRun = internalMutation({
  args: {
    organizationId: v.string(),
    createdBy: v.optional(v.string()),
    sourceUrl: v.string(),
    origin: v.string(),
    corpus: v.string(),
    pages: v.array(v.object({ url: v.string(), title: v.string() })),
  },
  returns: v.id("aiSetupRuns"),
  handler: async (ctx, args): Promise<Id<"aiSetupRuns">> => {
    const now = Date.now()

    return await ctx.db.insert("aiSetupRuns", {
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      sourceUrl: args.sourceUrl,
      origin: args.origin,
      status: "analyzing",
      corpus: args.corpus,
      pages: args.pages,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const patchRun = internalMutation({
  args: {
    runId: v.id("aiSetupRuns"),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.runId, {
      ...args.patch,
      updatedAt: Date.now(),
    })
  },
})

/** Reads a run and proves it belongs to the caller's organization. */
const loadOwnedRun = async (
  ctx: any,
  runId: Id<"aiSetupRuns">,
  organizationId: string
): Promise<Doc<"aiSetupRuns">> => {
  const run: Doc<"aiSetupRuns"> | null = await ctx.runQuery(
    internal.private.aiSetup.getRunInternal,
    { runId }
  )

  if (!run || run.organizationId !== organizationId) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Setup run not found",
    })
  }

  return run
}

const getOpenAiSecret = async (
  ctx: any,
  organizationId: string
): Promise<string | undefined> => {
  const plugin: { secretValue?: string } | null = await ctx.runQuery(
    internal.system.plugins.getByOrganizationIdAndService,
    { organizationId, service: "openai_realtime" }
  )

  return plugin?.secretValue as string | undefined
}

/* ── step 1: read the site, work out what to ask ────────────────────────── */

export const analyzeSite = action({
  args: { url: v.string() },
  returns: v.object({
    runId: v.id("aiSetupRuns"),
    pageCount: v.number(),
    profile: v.any(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    runId: Id<"aiSetupRuns">
    pageCount: number
    profile: unknown
  }> => {
    const { identity, orgId } = await requireOrganizationIdentity(ctx)

    // The crawl is the expensive, outbound-facing half of setup, so it carries
    // the same limits the knowledge base importer does.
    await enforceRateLimit(ctx, "websiteScrapeByUser", {
      key: `${orgId}:${identity.subject}`,
      message: "Too many setup runs. Please wait a moment before trying again.",
    })
    await enforceRateLimit(ctx, "websiteScrapeByOrg", {
      key: orgId,
      message: "This organization is running too many setups. Try again shortly.",
    })

    let crawl
    try {
      crawl = await crawlSite(args.url)
    } catch (error) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error
            ? error.message
            : "Could not read that website.",
      })
    }

    if (crawl.pages.length === 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message:
          "That address loaded, but there was no readable text on it. If the site needs JavaScript to show its content, add your details by hand instead.",
      })
    }

    const corpus = buildCorpus(crawl)

    const runId: Id<"aiSetupRuns"> = await ctx.runMutation(
      internal.private.aiSetup.createRun,
      {
        organizationId: orgId,
        createdBy: identity.subject,
        sourceUrl: args.url,
        origin: crawl.origin,
        corpus,
        pages: crawl.pages.map((page) => ({
          url: page.url,
          title: page.title,
        })),
      }
    )

    try {
      const secretValue = await getOpenAiSecret(ctx, orgId)

      const { object } = await generateObject({
        model: getOpenAIChatModelFromSecretValue(secretValue, SETUP_MODEL),
        schema: siteProfileSchema,
        system: [
          "You are setting up a customer support assistant for a small business, reading only their own website.",
          "Report what the site actually says. Never invent a price, an address, an opening time, or a service.",
          "`gaps` is the important field: list the things customers will certainly ask about that this website does NOT answer.",
          "`questions` must ask the owner about those gaps, in plain language a non-technical person understands.",
          "Ask about things a website cannot tell you: what counts as a good outcome, what the assistant must never say or promise, and anything a customer asks constantly that is not published.",
          "Never ask for API keys, passwords, or anything technical.",
          "Detect the languages the site is written in and return them as short codes such as uz, ru, en.",
        ].join(" "),
        prompt: [
          `Website: ${crawl.origin}`,
          `Pages read: ${crawl.pages.length}`,
          "",
          corpus,
        ].join("\n"),
      })

      const profile = {
        businessName: object.businessName,
        summary: object.summary,
        industry: object.industry,
        languages: object.languages,
        topics: object.topics,
        keyFacts: object.keyFacts,
        gaps: object.gaps,
      }

      await ctx.runMutation(internal.private.aiSetup.patchRun, {
        runId,
        patch: {
          status: "awaiting_answers",
          siteProfile: profile,
          answers: object.questions.map(
            (question: { id: string; question: string }) => ({
              id: question.id,
              question: question.question,
              answer: "",
            })
          ),
        },
      })

      return {
        runId,
        pageCount: crawl.pages.length,
        profile: { ...profile, questions: object.questions },
      }
    } catch (error) {
      await ctx.runMutation(internal.private.aiSetup.patchRun, {
        runId,
        patch: {
          status: "failed",
          error:
            error instanceof Error ? error.message : "Could not read that site.",
        },
      })

      throw error
    }
  },
})

/* ── step 2: write the setup ────────────────────────────────────────────── */

export const generatePlan = action({
  args: {
    runId: v.id("aiSetupRuns"),
    answers: v.array(
      v.object({
        id: v.string(),
        question: v.string(),
        answer: v.string(),
      })
    ),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    const { orgId } = await requireOrganizationIdentity(ctx)
    const run = await loadOwnedRun(ctx, args.runId, orgId)

    const answers = args.answers.map((answer) => ({
      id: answer.id,
      question: answer.question.slice(0, 500),
      answer: answer.answer.trim().slice(0, MAX_ANSWER_LENGTH),
    }))

    await ctx.runMutation(internal.private.aiSetup.patchRun, {
      runId: args.runId,
      patch: { status: "generating", answers },
    })

    try {
      const secretValue = await getOpenAiSecret(ctx, orgId)
      const profile = run.siteProfile
      const answered = answers
        .filter((answer) => answer.answer.length > 0)
        .map((answer) => `Q: ${answer.question}\nA: ${answer.answer}`)
        .join("\n\n")

      const { object } = await generateObject({
        model: getOpenAIChatModelFromSecretValue(secretValue, SETUP_MODEL),
        schema: planSchema,
        system: [
          "You configure customer support assistants for small businesses.",
          "",
          "The system prompt you write is the most important output. It must:",
          "- name the business and what the assistant is for;",
          "- tell the assistant to reply in whichever language the customer writes in, and name the languages this business actually serves;",
          "- forbid inventing prices, hours, availability, or policies, and say to hand off to a human instead;",
          "- state the business's own goal for the conversation, and how to collect the details needed for it, conversationally rather than as a form;",
          "- list what the assistant must never say, drawn from the owner's answers;",
          "- name explicitly the things the website does not cover, so the assistant routes those to a human rather than guessing.",
          "Write it in the second person, addressed to the assistant. Use short sections with plain headings. No markdown code fences.",
          "",
          "If this business gives regulated or safety-relevant advice - health, medical, dental, legal, financial - the system prompt MUST forbid diagnosing, prescribing, or advising, and must route those questions to a qualified human.",
          "",
          "`knowledgeDocs` must be faithful, well-organised documents built ONLY from the website text you were given. Keep every price, phone number, address and opening time exactly as written. Do not summarise them away. One document per real topic.",
          "`helpTopics` are short self-serve articles for the widget's help tab, in the business's main language.",
          "`tools` are recommendations only - suggest at most three, and only where this business would genuinely benefit. Explain each in `rationale` in the owner's terms.",
          "`primaryColor` must be a hex colour like #0e7490 that suits the business, taken from the site's own palette when you can infer it.",
          "Greeting, suggestions and widget copy must be in the business's main customer-facing language, not English, unless English is that language.",
        ].join("\n"),
        prompt: [
          `Business: ${profile?.businessName ?? run.origin}`,
          `Industry: ${profile?.industry ?? "unknown"}`,
          `Languages on the site: ${(profile?.languages ?? []).join(", ") || "unknown"}`,
          `Known gaps: ${(profile?.gaps ?? []).join("; ") || "none recorded"}`,
          "",
          answered ? `The owner answered:\n\n${answered}` : "The owner skipped the questions.",
          "",
          "Website content:",
          run.corpus ?? "",
        ].join("\n"),
      })

      const primaryColor = HEX_COLOR.test(object.primaryColor.trim())
        ? object.primaryColor.trim()
        : "#0e7490"

      const plan = {
        systemPrompt: object.systemPrompt,
        greetMessage: object.greetMessage,
        assistantName: object.assistantName,
        defaultSuggestions: {
          suggestion1: object.suggestion1,
          suggestion2: object.suggestion2,
          suggestion3: object.suggestion3,
        },
        widgetCopy: {
          homeGreeting: object.homeGreeting,
          homeHeadline: object.homeHeadline,
          inputPlaceholder: object.inputPlaceholder,
        },
        theme: {
          primaryColor,
          assistantName: object.assistantName,
        },
        helpTopics: object.helpTopics,
        tools: object.tools,
        knowledgeDocs: object.knowledgeDocs,
      }

      await ctx.runMutation(internal.private.aiSetup.patchRun, {
        runId: args.runId,
        patch: { status: "ready", plan },
      })

      return plan
    } catch (error) {
      await ctx.runMutation(internal.private.aiSetup.patchRun, {
        runId: args.runId,
        patch: {
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Could not write the setup.",
        },
      })

      throw error
    }
  },
})

/* ── step 3: apply, into the draft ──────────────────────────────────────── */

export const applyPlan = action({
  args: {
    runId: v.id("aiSetupRuns"),
    applyKnowledge: v.boolean(),
    applyWidget: v.boolean(),
    applyTools: v.boolean(),
  },
  returns: v.object({
    knowledgeDocsAdded: v.number(),
    widgetDraftSaved: v.boolean(),
    builtinToolsEnabled: v.number(),
    toolSuggestions: v.number(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    knowledgeDocsAdded: number
    widgetDraftSaved: boolean
    builtinToolsEnabled: number
    toolSuggestions: number
  }> => {
    const { orgId } = await requireOrganizationIdentity(ctx)
    const run = await loadOwnedRun(ctx, args.runId, orgId)

    if (!run.plan) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This setup has nothing to apply yet.",
      })
    }

    const plan = run.plan
    const applied: string[] = []

    let knowledgeDocsAdded = 0

    if (args.applyKnowledge) {
      for (const doc of plan.knowledgeDocs) {
        const body = doc.body.trim()

        if (!body) continue

        await ctx.runAction(internal.private.aiSetup.storeKnowledgeDoc, {
          organizationId: orgId,
          title: doc.title,
          body,
          sourceUrl: doc.sourceUrl ?? run.sourceUrl,
        })

        knowledgeDocsAdded += 1
      }

      if (knowledgeDocsAdded > 0) {
        applied.push("knowledge")
      }
    }

    let widgetDraftSaved = false

    if (args.applyWidget) {
      await ctx.runMutation(
        internal.private.widgetSettings.applyGeneratedDraft,
        {
          organizationId: orgId,
          greetMessage: plan.greetMessage,
          systemPrompt: plan.systemPrompt,
          defaultSuggestions: plan.defaultSuggestions,
          helpTopics: Array.isArray(plan.helpTopics) ? plan.helpTopics : [],
          homeCards: [],
          theme: plan.theme,
          widgetCopy: plan.widgetCopy,
        }
      )
      widgetDraftSaved = true
      applied.push("widget")
    }

    let builtinToolsEnabled = 0

    if (args.applyTools) {
      builtinToolsEnabled = await ctx.runMutation(
        internal.private.aiSetup.enableBuiltinTools,
        { organizationId: orgId }
      )
      applied.push("tools")
    }

    await ctx.runMutation(internal.private.aiSetup.patchRun, {
      runId: args.runId,
      patch: {
        status: "applied",
        appliedAt: Date.now(),
        appliedSurfaces: applied,
      },
    })

    return {
      knowledgeDocsAdded,
      widgetDraftSaved,
      builtinToolsEnabled,
      toolSuggestions: plan.tools.length,
    }
  },
})

/**
 * Stores one generated document in the knowledge base.
 *
 * Mirrors the website importer: the text is kept as a blob the owner can read
 * back from the Knowledge base page, and indexed under the organization's own
 * RAG namespace.
 */
export const storeKnowledgeDoc = internalAction({
  args: {
    organizationId: v.string(),
    title: v.string(),
    body: v.string(),
    sourceUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const filename = `${
      args.title
        .replaceAll(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replaceAll(/\s+/g, "-")
        .slice(0, 80) || "ai-setup-document"
    }.txt`

    const storageId = await ctx.storage.store(
      new Blob([args.body], { type: "text/plain" })
    )

    await ctx.runMutation((internal as any).system.storageObjects.claim, {
      storageId,
      organizationId: args.organizationId,
      purpose: "knowledge_base_website",
    })

    const bytes = new TextEncoder().encode(args.body)
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    )

    const { created } = await rag.add(ctx, {
      namespace: args.organizationId,
      text: args.body,
      key: args.title,
      title: args.title,
      metadata: {
        storageId,
        uploadedBy: args.organizationId,
        filename,
        category: "AI setup",
        sourceUrl: args.sourceUrl,
        sourceType: "website",
      } as any,
      contentHash: await contentHashFromArrayBuffer(buffer),
    })

    if (created) {
      await ctx.runMutation(
        (internal as any).system.ai.replyCache.clearForOrganization,
        { organizationId: args.organizationId }
      )
    } else {
      // The same document already exists; drop the duplicate blob rather than
      // leaving it orphaned in storage.
      await ctx.storage.delete(storageId)
      await ctx.runMutation((internal as any).system.storageObjects.release, {
        storageId,
      })
    }

    return null
  },
})

/**
 * Turns on the tools that actually work without further setup.
 *
 * The custom tool types all need credentials or a URL that only the owner has,
 * so AI setup recommends those in the plan rather than creating them broken.
 * The built-ins - knowledge base search, human handoff, resolve - are the ones
 * a generated assistant genuinely needs on day one.
 */
export const enableBuiltinTools = internalMutation({
  args: { organizationId: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("assistantTools")
      .withIndex("by_organization_id", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .collect()

    const byType = new Map(existing.map((tool) => [tool.type, tool]))
    const now = Date.now()
    let touched = 0

    for (const builtin of BUILTIN_ASSISTANT_TOOLS) {
      const current = byType.get(builtin.type)

      if (!current) {
        await ctx.db.insert("assistantTools", {
          organizationId: args.organizationId,
          name: builtin.name,
          description: builtin.description,
          type: builtin.type,
          isBuiltin: true,
          isEnabled: true,
          enabledForChat: true,
          enabledForVoice: builtin.type === "query",
          parameters: builtin.parameters,
          config:
            builtin.type === "query"
              ? { knowledgeBaseModel: OPENAI_CHAT_MODEL }
              : undefined,
          sortOrder: builtin.sortOrder,
          updatedAt: now,
        })
        touched += 1
        continue
      }

      if (!current.isEnabled || !current.enabledForChat) {
        await ctx.db.patch(current._id, {
          isEnabled: true,
          enabledForChat: true,
          updatedAt: now,
        })
        touched += 1
      }
    }

    return touched
  },
})

/* ── reading a run back ─────────────────────────────────────────────────── */

export const getRun = query({
  args: { runId: v.id("aiSetupRuns") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const { orgId } = await requireOrganizationIdentity(ctx)
    const run = await ctx.db.get(args.runId)

    if (!run || run.organizationId !== orgId) {
      return null
    }

    // The corpus is large and only the server needs it.
    const { corpus: _corpus, ...rest } = run

    return rest
  },
})

/* ── workflows ──────────────────────────────────────────────────────────── */

const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum([
    "start",
    "message",
    "capture",
    "buttons",
    "condition",
    "setVariable",
    "agent",
    "kbSearch",
    "end",
  ]),
  label: z.string(),
  /** Free-form per-type payload; validated and shaped after generation. */
  text: z.string().optional(),
  variable: z.string().optional(),
  value: z.string().optional(),
  instructions: z.string().optional(),
  options: z.array(z.string()).optional(),
  conditionVariable: z.string().optional(),
  conditionOperator: z
    .enum(["equals", "not_equals", "contains", "not_contains", "exists", "not_exists"])
    .optional(),
  conditionValue: z.string().optional(),
})

const workflowPlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  nodes: z.array(workflowNodeSchema).min(3).max(14),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      /** "true"/"false" for a condition, or a button label. */
      branch: z.string().optional(),
    })
  ),
})

/** Laid out as a simple column so the generated graph is readable on the canvas. */
const NODE_X = 320
const NODE_Y_STEP = 170

/**
 * Drafts a whole workflow graph from a described goal.
 *
 * Returns a definition in the builder's own shape rather than saving it, so the
 * canvas stays the place a workflow is committed - the owner sees the graph,
 * moves it around, and saves when it looks right.
 */
export const generateWorkflowDraft = action({
  args: {
    goal: v.string(),
    /** Ground the flow in the business's own pages when a setup run exists. */
    runId: v.optional(v.id("aiSetupRuns")),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    const { identity, orgId } = await requireOrganizationIdentity(ctx)

    const goal = args.goal.trim()

    if (!goal) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Describe what the workflow should do.",
      })
    }

    await enforceRateLimit(ctx, "websiteScrapeByUser", {
      key: `${orgId}:${identity.subject}:workflow`,
      message: "Too many workflow drafts. Please wait a moment.",
    })

    let businessContext = ""

    if (args.runId) {
      const run = await loadOwnedRun(ctx, args.runId, orgId)
      const profile = run.siteProfile

      businessContext = [
        profile ? `Business: ${profile.businessName} (${profile.industry})` : "",
        profile ? `Summary: ${profile.summary}` : "",
        profile?.keyFacts?.length
          ? `Key facts: ${profile.keyFacts.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n")
    }

    const secretValue = await getOpenAiSecret(ctx, orgId)

    const { object } = await generateObject({
      model: getOpenAIChatModelFromSecretValue(secretValue, SETUP_MODEL),
      schema: workflowPlanSchema,
      system: [
        "You design deterministic customer-support workflows as node graphs.",
        "",
        "Rules that make a graph valid:",
        "- exactly one `start` node, and it is the first node;",
        "- every path ends at an `end` node;",
        "- every non-terminal node has at least one outgoing edge;",
        "- a `condition` node has exactly two outgoing edges, with branch \"true\" and branch \"false\";",
        "- a `buttons` node has one outgoing edge per option, and the edge's branch equals the option label exactly;",
        "- edge `source` and `target` must be ids of nodes you returned.",
        "",
        "Node meanings: `message` says something; `capture` asks a question and stores the reply in `variable`; `buttons` offers fixed choices; `condition` branches on a variable; `setVariable` stores a value; `agent` hands a step to the AI with `instructions`; `kbSearch` looks the answer up in the knowledge base; `end` finishes.",
        "",
        "Prefer capture + condition over an agent step when the outcome must be identical every time - that is the whole point of a workflow.",
        "Write all customer-facing text in the language the goal is written in.",
        "Keep it under ten nodes unless the goal genuinely needs more.",
      ].join("\n"),
      prompt: [
        businessContext,
        businessContext ? "" : null,
        `Goal: ${goal}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    })

    // Give every node a position so the graph is legible the moment it lands.
    const nodes = object.nodes.map((node, index) => ({
      id: node.id,
      type: node.type,
      position: { x: NODE_X, y: 80 + index * NODE_Y_STEP },
      data: {
        label: node.label,
        ...(node.text ? { text: node.text } : {}),
        ...(node.variable ? { variable: node.variable } : {}),
        ...(node.value ? { value: node.value } : {}),
        ...(node.instructions ? { instructions: node.instructions } : {}),
        ...(node.options
          ? {
              options: node.options.map((label, optionIndex) => ({
                id: `${node.id}-option-${optionIndex}`,
                label,
              })),
            }
          : {}),
        ...(node.conditionVariable
          ? {
              variable: node.conditionVariable,
              operator: node.conditionOperator ?? "equals",
              value: node.conditionValue ?? "",
            }
          : {}),
      },
    }))

    const nodeIds = new Set(nodes.map((node) => node.id))

    // Drop edges the model invented for nodes it did not return, rather than
    // handing the canvas a graph that cannot render.
    const edges = object.edges
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge, index) => ({
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        ...(edge.branch ? { sourceHandle: edge.branch } : {}),
      }))

    return {
      schemaVersion: 1,
      name: object.name,
      description: object.description,
      nodes,
      edges,
    }
  },
})
