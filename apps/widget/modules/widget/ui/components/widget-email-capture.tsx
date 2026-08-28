"use client"

import { useState } from "react"
import { ChevronDownIcon, MailIcon } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_MAX_LENGTH = 40
const EMAIL_MAX_LENGTH = 50

export const WidgetEmailCapture = ({
  onSubmitDetails,
  receivedDetails,
}: {
  onSubmitDetails: (details: { name: string; email: string }) => Promise<void>
  receivedDetails: { name: string; email: string } | null
}) => {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(
    () => receivedDetails !== null
  )

  const isReceived = receivedDetails !== null

  const handleSubmit = async () => {
    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedName) {
      setError("Enter your name")
      return
    }

    if (trimmedName.length > NAME_MAX_LENGTH) {
      setError(`Name must be ${NAME_MAX_LENGTH} characters or less`)
      return
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Enter a valid email address")
      return
    }

    if (trimmedEmail.length > EMAIL_MAX_LENGTH) {
      setError(`Email must be ${EMAIL_MAX_LENGTH} characters or less`)
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      await onSubmitDetails({ name: trimmedName, email: trimmedEmail })
      setIsCollapsed(true)
    } catch {
      setError("Enter a real email address that can receive mail")
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = name.trim().length > 0 && email.trim().length > 0

  return (
    <div className="w-full py-2">
      <div className="flex items-center gap-x-2 px-1 text-foreground">
        <MailIcon aria-hidden="true" className="size-3.5 shrink-0 opacity-70" />
        <p className="text-[0.8rem] font-medium">
          {isReceived ? "Details received" : "Enter your details to continue"}
        </p>
        {isReceived ? (
          <button
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Show details" : "Hide details"}
            className="ml-auto flex size-6 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/70"
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
        <div className="owc-capture mt-2.5 px-4 py-3">
          <p className="text-[0.78rem] font-semibold text-foreground">Name</p>
          {isReceived ? (
            <p className="mt-1 pb-1 text-[0.9rem] text-foreground">
              {receivedDetails.name}
            </p>
          ) : (
            <input
              autoComplete="name"
              className="mt-1 w-full border-0 bg-transparent pb-1 text-[0.9rem] text-foreground outline-none placeholder:text-muted-foreground/60"
              disabled={isSubmitting}
              maxLength={NAME_MAX_LENGTH}
              onChange={(event) =>
                setName(event.target.value.slice(0, NAME_MAX_LENGTH))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleSubmit()
                }
              }}
              placeholder="Your name"
              type="text"
              value={name}
            />
          )}

          <div className="my-2.5 h-px bg-[var(--owc-hairline,var(--border))]" />

          <p className="text-[0.78rem] font-semibold text-foreground">Email</p>
          {isReceived ? (
            <p className="mt-1 pb-1 text-[0.9rem] text-foreground">
              {receivedDetails.email}
            </p>
          ) : (
            <input
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              className="mt-1 w-full border-0 bg-transparent pb-1 text-[0.9rem] text-foreground outline-none placeholder:text-muted-foreground/60"
              disabled={isSubmitting}
              inputMode="email"
              maxLength={EMAIL_MAX_LENGTH}
              onChange={(event) =>
                setEmail(event.target.value.slice(0, EMAIL_MAX_LENGTH))
              }
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
            className="mt-2.5 h-9 rounded-full px-5 text-[0.82rem] font-semibold"
            disabled={isSubmitting || !canSubmit}
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
