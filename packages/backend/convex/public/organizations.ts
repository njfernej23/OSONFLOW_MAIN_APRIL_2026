"use node";

import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { enforceRateLimit } from "../lib/rateLimits";

export const validate = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    // Unauthenticated by design (the widget calls it before a session exists),
    // so cap it to stop the endpoint being used to enumerate organization ids
    // or to burn through the upstream Clerk API quota.
    await enforceRateLimit(ctx, "organizationValidate", {
      key: args.organizationId,
      message: "Too many validation attempts. Please try again shortly.",
    });

    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY || "",
    });

    try {
      await clerkClient.organizations.getOrganization({
        organizationId: args.organizationId,
      });

      return { valid: true };
    } catch {
      return { valid: false, reason: "Organization not valid" };
    }
  },
});
