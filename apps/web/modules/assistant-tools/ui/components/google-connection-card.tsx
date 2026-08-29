"use client"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import {
  ExternalLinkIcon,
  KeyRoundIcon,
  Loader2Icon,
  LogOutIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"

import {
  Panel,
  PanelBody,
  PanelHeader,
  Pill,
} from "@/modules/dashboard/ui/components/console"

export type GoogleSheetsStatus =
  | {
      isConfigured: boolean
      authMethod?: "oauth" | "api_key"
      email?: string
      oauthAvailable: boolean
    }
  | undefined

type GoogleConnectionCardProps = {
  status: GoogleSheetsStatus
  variant?: "full" | "compact"
  isConnecting: boolean
  isDisconnecting: boolean
  isSavingApiKey: boolean
  apiKey: string
  showApiKeyFallback: boolean
  onApiKeyChange: (value: string) => void
  onToggleApiKeyFallback: () => void
  onSaveApiKey: () => void
  onConnect: () => void
  onDisconnect: () => void
  /** Compact variant only — jumps to the connections section. */
  onManage?: () => void
  spreadsheetCount?: number
  loadError?: string | null
  onRefresh?: () => void
  isRefreshing?: boolean
}

const StatusPill = ({ status }: { status: GoogleSheetsStatus }) => {
  if (status?.authMethod === "oauth") {
    return (
      <Pill icon={ShieldCheckIcon} tone="positive">
        {status.email ?? "Connected"}
      </Pill>
    )
  }

  if (status?.authMethod === "api_key") {
    return (
      <Pill icon={KeyRoundIcon} tone="warning">
        API key — lookups only
      </Pill>
    )
  }

  return (
    <Pill icon={TriangleAlertIcon} tone="neutral">
      Not connected
    </Pill>
  )
}

export const GoogleConnectionCard = ({
  status,
  variant = "full",
  isConnecting,
  isDisconnecting,
  isSavingApiKey,
  apiKey,
  showApiKeyFallback,
  onApiKeyChange,
  onToggleApiKeyFallback,
  onSaveApiKey,
  onConnect,
  onDisconnect,
  onManage,
  spreadsheetCount,
  loadError,
  onRefresh,
  isRefreshing = false,
}: GoogleConnectionCardProps) => {
  const isOAuth = status?.authMethod === "oauth"

  if (variant === "compact") {
    return (
      <div className="console-inset flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusPill status={status} />
          <span className="truncate text-xs text-muted-foreground">
            {isOAuth
              ? `${spreadsheetCount ?? 0} spreadsheet${
                  spreadsheetCount === 1 ? "" : "s"
                } available`
              : "Connect Google to browse spreadsheets and tabs here."}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isOAuth && onRefresh ? (
            <Button
              disabled={isRefreshing}
              onClick={onRefresh}
              size="xs"
              type="button"
              variant="ghost"
            >
              {isRefreshing ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RefreshCwIcon />
              )}
              Refresh
            </Button>
          ) : null}
          {isOAuth ? (
            onManage ? (
              <Button
                onClick={onManage}
                size="xs"
                type="button"
                variant="ghost"
              >
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
        description="Used by every Google Sheets tool in this workspace. Connect once — individual tools then only pick a spreadsheet and tab."
        icon={ShieldCheckIcon}
        title="Google account"
      />
      <PanelBody className="space-y-4">
        {!status?.oauthAvailable ? (
          <p className="console-tone-warning console-tone-wash rounded-[10px] border px-3 py-2 text-xs">
            Google sign-in is not configured on the server yet. Ask an admin to
            set the Google OAuth environment variables in Convex, or use an API
            key below.
          </p>
        ) : isOAuth ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            If spreadsheets do not appear, remove Osonflow from your{" "}
            <a
              className="inline-flex items-center gap-1 underline underline-offset-2"
              href="https://myaccount.google.com/permissions"
              rel="noreferrer"
              target="_blank"
            >
              Google account permissions
              <ExternalLinkIcon className="size-3" />
            </a>
            , then disconnect and reconnect so Drive access is granted again.
            The Google Drive API also has to be enabled for the OAuth project.
          </p>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Connect the Google account that owns — or can open — the
            spreadsheets your assistant should read and write. Sheets tools
            other than lookup require OAuth.
          </p>
        )}

        {loadError ? (
          <p className="console-tone-warning console-tone-wash rounded-[10px] border px-3 py-2 text-xs">
            {loadError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {isOAuth ? (
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

          {onRefresh && isOAuth ? (
            <Button
              disabled={isRefreshing}
              onClick={onRefresh}
              type="button"
              variant="outline"
            >
              {isRefreshing ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <RefreshCwIcon />
              )}
              Refresh spreadsheets
            </Button>
          ) : null}

          <Button
            className="ml-auto"
            onClick={onToggleApiKeyFallback}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showApiKeyFallback ? "Hide API key option" : "Use API key instead"}
          </Button>
        </div>

        {showApiKeyFallback ? (
          <div
            className={cn(
              "space-y-2 rounded-[10px] border border-dashed border-[var(--console-hairline-soft)] bg-muted/35 p-3"
            )}
          >
            <p className="text-xs text-muted-foreground">
              Advanced: an API key only works for public sheets, or sheets
              shared with your Google Cloud project, and only for lookups.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                className="font-mono text-xs"
                onChange={(event) => onApiKeyChange(event.target.value)}
                placeholder="AIza…"
                type="password"
                value={apiKey}
              />
              <Button
                disabled={isSavingApiKey}
                onClick={onSaveApiKey}
                type="button"
                variant="outline"
              >
                {isSavingApiKey ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  "Save key"
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </PanelBody>
    </Panel>
  )
}
