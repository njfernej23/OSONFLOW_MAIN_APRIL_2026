"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useOrganization } from "@clerk/nextjs"
import { ArrowLeftIcon, InfoIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import { DEFAULT_WIDGET_SCRIPT_URL } from "@/modules/integrations/constants"

const DEFAULT_AGENT_ID = "default"
const SCRIPT_ID = "osonflow-widget-preview"

type EchoWidgetApi = { destroy?: () => void }

/**
 * A stand-in for the customer's website.
 *
 * It loads the same embed script a real site would, with the same
 * organization id, so what appears in the corner is the published widget —
 * not a mock of it. Anything typed here arrives in the inbox like any other
 * conversation, which makes this the safest way to try the assistant before
 * the code is on a live site.
 */
export const WidgetPreviewView = () => {
  const { organization, isLoaded } = useOrganization()
  const organizationId = organization?.id
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    if (!organizationId) {
      return
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = DEFAULT_WIDGET_SCRIPT_URL
    script.defer = true
    script.dataset.organizationId = organizationId
    script.dataset.agentId = DEFAULT_AGENT_ID
    script.onerror = () => setHasFailed(true)

    document.body.appendChild(script)

    return () => {
      const widget = (
        window as Window & { EchoWidget?: EchoWidgetApi }
      ).EchoWidget
      widget?.destroy?.()
      script.remove()
    }
  }, [organizationId])

  return (
    <main className="relative min-h-svh bg-background">
      {/* A quiet page for the widget to sit on — the widget is the subject. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="mesh-grid absolute inset-0 opacity-30" />
        <div className="absolute top-[-8rem] right-[-6rem] size-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-svh w-full max-w-3xl flex-col px-6 py-8">
        <div className="flex items-center justify-between gap-3">
          <Button asChild className="gap-1.5" size="sm" variant="ghost">
            <Link href="/start">
              <ArrowLeftIcon className="size-3.5" />
              Back to setup
            </Link>
          </Button>
          <Button asChild className="gap-1.5" size="sm" variant="outline">
            <Link href="/customization">Change how it looks</Link>
          </Button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-16">
          <p className="console-eyebrow">Preview</p>
          <h1 className="console-title mt-2">This is your website</h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Not really — but your published chat button is sitting in the corner
            exactly as it will on your own pages. Open it and ask a question;
            the conversation lands in your inbox like any other.
          </p>

          <div className="console-inset mt-8 flex max-w-lg items-start gap-3 px-4 py-3.5">
            <InfoIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {!isLoaded ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-3" />
                  Loading your workspace…
                </span>
              ) : hasFailed ? (
                <>
                  The widget script could not be loaded from{" "}
                  <span className="font-mono text-foreground">
                    {DEFAULT_WIDGET_SCRIPT_URL}
                  </span>
                  . Check that the widget host is reachable from this network.
                </>
              ) : (
                <>
                  Publishing a change in the designer updates this page on the
                  next reload. Anything you send here is a real conversation, so
                  feel free to resolve it afterwards.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Faux page furniture, so the launcher has something to sit against. */}
        <div aria-hidden className="space-y-2.5 opacity-25">
          <div className="h-3 w-2/3 rounded-full bg-foreground/25" />
          <div className="h-2.5 w-full rounded-full bg-foreground/15" />
          <div className="h-2.5 w-5/6 rounded-full bg-foreground/15" />
          <div className="h-2.5 w-3/4 rounded-full bg-foreground/15" />
        </div>
      </div>
    </main>
  )
}
