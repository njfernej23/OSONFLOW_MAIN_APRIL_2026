"use client"

import { useState } from "react"
import { ChevronDownIcon, MailIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const WidgetEmailCapture = ({
  onSubmitEmail,
  receivedEmail,
}: {
  onSubmitEmail: (email: string) => Promise<void>
  receivedEmail: string | null
}) => {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const isReceived = receivedEmail !== null

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase()

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address")
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmitEmail(trimmedEmail)
    } catch {
      setError("Enter a real email address that can receive mail")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full py-2">
      <div className="flex items-center gap-x-2 px-1 text-[var(--widget-bot-bubble-foreground,inherit)]">
        <MailIcon aria-hidden="true" className="size-4 shrink-0 opacity-80" />
        <p className="text-sm font-medium">
          {isReceived ? "Email received" : "Enter your email to continue"}
        </p>
        {isReceived ? (
          <button
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Show email" : "Hide email"}
            className="flex size-6 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/70"
            onClick={() => setIsCollapsed((previous) => !previous)}
            type="button"
          >
            <ChevronDownIcon
              className={cn(
                "size-3.5 transition-transform",
                isCollapsed && "-rotate-90"
              )}
            />
          </button>
        ) : null}
      </div>

      {isReceived && isCollapsed ? null : (
        <div className="mt-3 rounded-3xl border bg-background px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Email</p>
          {isReceived ? (
            <p className="mt-1 pb-1 text-base text-foreground">
              {receivedEmail}
            </p>
          ) : (
            <input
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="mt-1 w-full border-0 bg-transparent pb-1 text-base text-foreground outline-none placeholder:text-muted-foreground/60"
              disabled={isSubmitting}
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              placeholder="email@example.com"
              spellCheck={false}
              type="email"
              value={email}
            />
          )}
        </div>
      )}

      {!isReceived ? (
        <>
          {error ? (
            <p className="mt-2 px-1 text-xs text-destructive">{error}</p>
          ) : null}
          <Button
            className="mt-3 h-10 rounded-full px-6 text-sm font-semibold"
            disabled={isSubmitting || !email.trim()}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSubmitting ? "Sending..." : "Continue"}
          </Button>
        </>
      ) : null}
    </div>
  )
}
