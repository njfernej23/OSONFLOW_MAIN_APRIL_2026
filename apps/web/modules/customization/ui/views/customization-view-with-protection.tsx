"use client";

import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate";
import { CustomizationView } from "./customization-view";

export const CustomizationViewWithProtection = () => {
  return (
    <ProFeatureGate>
      <CustomizationView />
    </ProFeatureGate>
  );
};
