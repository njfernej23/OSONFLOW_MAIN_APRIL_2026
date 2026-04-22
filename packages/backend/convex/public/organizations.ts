"use node";

import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { action } from "../_generated/server";

export const validate = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (_, args) => {
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
