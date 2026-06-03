"use client";

import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate";
import { VapiView } from "./vapi-view";

export const VapiViewWithProtection = () => {
  return (
    <ProFeatureGate>
      <VapiView />
    </ProFeatureGate>
  );
};
