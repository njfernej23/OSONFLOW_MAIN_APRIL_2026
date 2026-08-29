import {
  BookOpenIcon,
  PhoneForwardedIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react"

import { plannedBlueprint } from "./helpers"
import type { ToolBlueprint } from "./types"

/** Capabilities every assistant already has — configured, never installed. */
export const builtinBlueprints: ToolBlueprint[] = [
  {
    id: "builtin_query",
    title: "Knowledge base search",
    vendor: "Included",
    category: "assistant",
    summary:
      "Answers from your uploaded documents and articles, interpreted by the model you choose.",
    status: "included",
    icon: BookOpenIcon,
    tone: "info",
    brand: "#2a78d6",
    tags: ["Retrieval", "Chat & voice"],
    effect: "read",
    highlights: [
      "Searches everything in the workspace knowledge base, scoped to this organization.",
      "The interpreting model is configurable per workspace.",
      "Runs on both chat and voice channels.",
    ],
    builtinType: "query",
  },
  {
    id: "builtin_handoff",
    title: "Human handoff",
    vendor: "Included",
    category: "assistant",
    summary:
      "Escalates the conversation to an operator and marks it for the inbox.",
    status: "included",
    icon: UsersIcon,
    tone: "warning",
    brand: "#eda100",
    tags: ["Escalation", "Chat"],
    effect: "write",
    highlights: [
      "Moves the thread into the operator inbox with its full history attached.",
      "The assistant stops replying until an operator releases the thread.",
      "Chat only — a voice call uses warm transfer instead.",
    ],
    builtinType: "handoff",
  },
  {
    id: "builtin_resolve",
    title: "Resolve conversation",
    vendor: "Included",
    category: "assistant",
    summary:
      "Closes the thread once the customer's issue has actually been settled.",
    status: "included",
    icon: ShieldCheckIcon,
    tone: "positive",
    brand: "#1baf7a",
    tags: ["Lifecycle", "Chat"],
    effect: "write",
    highlights: [
      "Marks the conversation resolved so it leaves the open queue.",
      "The description you write is what stops the model closing threads early.",
      "Chat only.",
    ],
    builtinType: "resolve",
  },
  plannedBlueprint({
    id: "voice_transfer",
    title: "Warm call transfer",
    vendor: "Voice",
    brand: "#7856ff",
    category: "assistant",
    icon: PhoneForwardedIcon,
    summary:
      "Hand a live voice call to a human with the transcript and context already summarised.",
    tags: ["Voice", "Escalation"],
    effect: "write",
    highlights: [
      "Bridges the caller to an on-call number instead of ending the call.",
      "Passes a summary of the conversation so far to whoever picks up.",
    ],
  }),
]
