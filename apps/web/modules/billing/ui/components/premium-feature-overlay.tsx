"use client"

import {
  type LucideIcon,
  BotIcon,
  GemIcon,
  PhoneIcon,
  UsersIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"

interface Feature {
  icon: LucideIcon
  label: string
  description: string
}

interface PremiumFeatureOverlayProps {
  children: React.ReactNode
}

const features: Feature[] = [
  {
    icon: UsersIcon,
    label: "Customer memory",
    description: "Context on every returning customer",
  },
  {
    icon: BotIcon,
    label: "Knowledge base",
    description: "Answers trained on your own content",
  },
  {
    icon: PhoneIcon,
    label: "Voice AI",
    description: "Realtime calls with full transcripts",
  },
]

export const PremiumFeatureOverlay = ({
  children,
}: PremiumFeatureOverlayProps) => {
  const router = useRouter()

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      {/* the gated page, softened rather than hidden */}
      <div
        aria-hidden
        className="pointer-events-none h-full overflow-hidden select-none blur-[3px]"
      >
        {children}
      </div>

      <div className="absolute inset-0 z-10 bg-background/72 backdrop-blur-[3px]" />

      <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
        <div className="console-card w-full max-w-md shadow-[var(--console-shadow-lift)]">
          <div className="flex flex-col items-center px-6 pt-7 text-center">
            <span className="console-medallion size-12">
              <GemIcon className="size-5" />
            </span>
            <p className="console-eyebrow mt-4">Pro plan</p>
            <h2 className="console-title mt-2 text-[1.35rem]">
              Unlock this workspace
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This page is part of the Pro plan, alongside the rest of the
              premium AI toolset.
            </p>
          </div>

          <div className="console-rule my-6" />

          <div className="space-y-4 px-6">
            {features.map((feature) => (
              <div className="flex items-center gap-3" key={feature.label}>
                <span className="console-medallion size-9 shrink-0">
                  <feature.icon className="size-4" />
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {feature.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 pt-6 pb-6">
            <Button
              className="w-full"
              onClick={() => router.push("/billing")}
              size="lg"
            >
              Upgrade to Pro
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
