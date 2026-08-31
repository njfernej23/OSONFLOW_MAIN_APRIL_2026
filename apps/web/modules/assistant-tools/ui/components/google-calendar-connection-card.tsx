"use client"

import { Button } from "@workspace/ui/components/button"
import {
  Loader2Icon,
  LogOutIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  Panel,
  PanelBody,
  PanelHeader,
  Pill,
} from "@/modules/dashboard/ui/components/console"

export type GoogleCalendarStatus =
  | {
      isConfigured: boolean
      email?: string
      oauthAvailable: boolean
    }
  | undefined

type GoogleCalendarConnectionCardProps = {
  status: GoogleCalendarStatus
  variant?: "full" | "compact"
  isConnecting: boolean
  isDisconnecting: boolean
  onConnect: () => void
  onDisconnect: () => void
  /** Compact variant only — jumps to the connections section. */
  onManage?: () => void
}

const StatusPill = ({ status }: { status: GoogleCalendarStatus }) => {
  if (status?.isConfigured) {
    return (
      <Pill icon={ShieldCheckIcon} tone="positive">
        {status.email ?? "Connected"}
      </Pill>
    )
  }

  return (
    <Pill icon={TriangleAlertIcon} tone="neutral">
      Not connected
    </Pill>
  )
}

export const GoogleCalendarConnectionCard = ({
  status,
  variant = "full",
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
  onManage,
}: GoogleCalendarConnectionCardProps) => {
  const isConnected = Boolean(status?.isConfigured)

  if (variant === "compact") {
    return (
      <div className="console-inset flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusPill status={status} />
          <span className="truncate text-xs text-muted-foreground">
            {isConnected
              ? "Every Calendar tool in this workspace reuses this account."
              : "Connect Google to let this tool read and write calendar events."}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isConnected ? (
            onManage ? (
              <Button onClick={onManage} size="xs" type="button" variant="ghost">
                Manage
              </Button>
            ) : null
          ) : (
            <Button
              disabled={isConnecting || !status?.oauthAvailable}
              onClick={onConnect}
              size="xs"
              type="button"
            >
              {isConnecting ? <Loader2Icon className="animate-spin" /> : null}
              Connect Google
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Panel>
      <PanelHeader
        actions={<StatusPill status={status} />}
        description="Used by every Google Calendar tool in this workspace. Connect once — individual tools then only pick which calendar to use."
        icon={ShieldCheckIcon}
        title="Google Calendar account"
      />
      <PanelBody className="space-y-4">
        {!status?.oauthAvailable ? (
          <p className="console-tone-warning console-tone-wash rounded-[10px] border px-3 py-2 text-xs">
            Google Calendar sign-in is not configured on the server yet. Ask
            an admin to set the Google Calendar OAuth environment variables in
            Convex.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Connect the Google account whose calendar your assistant should
            read from and book on. The assistant can only see and change
            events on calendars this account can access.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {isConnected ? (
            <Button
              disabled={isDisconnecting}
              onClick={onDisconnect}
              type="button"
              variant="outline"
            >
              {isDisconnecting ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <LogOutIcon />
              )}
              Disconnect
            </Button>
          ) : (
            <Button
              disabled={isConnecting || !status?.oauthAvailable}
              onClick={onConnect}
              type="button"
            >
              {isConnecting ? <Loader2Icon className="animate-spin" /> : null}
              Connect Google account
            </Button>
          )}
        </div>
      </PanelBody>
    </Panel>
  )
}
