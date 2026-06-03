"use client";

import { ProFeatureGate } from "@/modules/billing/ui/components/pro-feature-gate";
import { FilesView } from "./files-view";

export const FilesViewWithProtection = () => {
  return (
    <ProFeatureGate>
      <FilesView />
    </ProFeatureGate>
  );
};

