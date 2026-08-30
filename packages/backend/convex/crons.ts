import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

// Uploads that were never sent hold a blob nothing references. Sweeping them
// keeps an abandoned composer from accumulating storage indefinitely.
crons.interval(
  "sweep orphaned chat attachments",
  { hours: 6 },
  internal.system.chatAttachments.sweepOrphans,
  {}
)

export default crons
