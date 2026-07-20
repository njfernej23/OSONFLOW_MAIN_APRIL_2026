// Liveblocks type definitions for workflow collaboration.
// See https://liveblocks.io/docs/guides/authentication

export type WorkflowPresence = {
  cursor: { x: number; y: number } | null
  selectedNodeId: string | null
}

declare global {
  interface Liveblocks {
    Presence: WorkflowPresence
    UserMeta: {
      id: string
      info: {
        name: string
        avatar?: string
        color: string
      }
    }
  }
}

export {}
