import { atomWithStorage } from "jotai/utils";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { ASSIGNMENT_FILTER_KEY, STATUS_FILTER_KEY } from "./constants";

export const statusFilterAtom = atomWithStorage<
  Doc<"conversations">["status"] | "all"
>(STATUS_FILTER_KEY, "all");

export type AssignmentFilter = "all" | "assigned_to_me" | "unassigned";

export const assignmentFilterAtom = atomWithStorage<AssignmentFilter>(
  ASSIGNMENT_FILTER_KEY,
  "all"
);
