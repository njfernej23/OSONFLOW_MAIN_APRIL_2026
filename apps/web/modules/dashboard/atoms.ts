import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import {
  ASSIGNMENT_FILTER_KEY,
  SOURCE_FILTER_KEY,
  STATUS_FILTER_KEY,
} from "./constants";

export const statusFilterAtom = atomWithStorage<
  Doc<"conversations">["status"] | "all"
>(STATUS_FILTER_KEY, "all");

export type AssignmentFilter = "all" | "assigned_to_me" | "unassigned";

export const assignmentFilterAtom = atomWithStorage<AssignmentFilter>(
  ASSIGNMENT_FILTER_KEY,
  "all"
);

/** Which surface started the conversation: a published workflow, or the AI assistant. */
export type SourceFilter = "all" | "workflow" | "widget";

export const sourceFilterAtom = atomWithStorage<SourceFilter>(
  SOURCE_FILTER_KEY,
  "all"
);

// Conversations the operator currently has open. New-message sounds are
// suppressed for these, but still play for every other thread.
export const openConversationIdAtom = atom<Id<"conversations"> | null>(null);

export const openAiConversationIdAtom =
  atom<Id<"aiVoiceConversations"> | null>(null);
