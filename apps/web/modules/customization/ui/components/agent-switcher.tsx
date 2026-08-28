"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { BotIcon, Loader2Icon, PencilIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

const DEFAULT_AGENT_ID = "default"

type AgentSummary = {
  agentId: string
  name: string
  isDefault: boolean
  publishedVersion: number
  updatedAt?: number
}

type AgentSwitcherProps = {
  agentId: string
  onAgentIdChange: (agentId: string) => void
}

export const AgentSwitcher = ({
  agentId,
  onAgentIdChange,
}: AgentSwitcherProps) => {
  const agentsState = useQuery(api.private.widgetSettings.listAgents)
  const createAgent = useMutation(api.private.widgetSettings.createAgent)
  const renameAgent = useMutation(api.private.widgetSettings.renameAgent)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [renameName, setRenameName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)

  const agents = (agentsState?.agents ?? []) as AgentSummary[]
  const canCreateAgent = Boolean(agentsState?.canCreateAgent)
  const limit = agentsState?.limit ?? 1

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.agentId === agentId) ?? agents[0],
    [agents, agentId]
  )

  useEffect(() => {
    if (!agentsState || agents.length === 0) return
    const exists = agents.some((agent) => agent.agentId === agentId)
    if (!exists) {
      onAgentIdChange(agents[0]?.agentId ?? DEFAULT_AGENT_ID)
    }
  }, [agentId, agents, agentsState, onAgentIdChange])

  const openRename = () => {
    setRenameName(selectedAgent?.name ?? "")
    setIsRenameOpen(true)
  }

  const onCreate = async () => {
    setIsCreating(true)
    try {
      const result = await createAgent({
        name: createName.trim() || undefined,
      })
      onAgentIdChange(result.agentId)
      setCreateName("")
      setIsCreateOpen(false)
      toast.success("Agent created")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create agent"
      toast.error(message)
    } finally {
      setIsCreating(false)
    }
  }

  const onRename = async () => {
    const name = renameName.trim()
    if (!name) {
      toast.error("Agent name is required")
      return
    }

    setIsRenaming(true)
    try {
      await renameAgent({
        agentId,
        name,
      })
      setIsRenameOpen(false)
      toast.success("Agent renamed")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to rename agent"
      toast.error(message)
    } finally {
      setIsRenaming(false)
    }
  }

  if (agentsState === undefined) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-xl border border-[var(--console-hairline-soft)] bg-card px-3 text-sm text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading agents...
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Agent
          </Label>
          <div className="flex items-center gap-2">
            <Select value={agentId} onValueChange={onAgentIdChange}>
              <SelectTrigger className="h-10 bg-card">
                <div className="flex min-w-0 items-center gap-2">
                  <BotIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Select agent" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.agentId} value={agent.agentId}>
                    {agent.name}
                    {agent.isDefault ? " (default)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={openRename}
              title="Rename agent"
            >
              <PencilIcon className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0"
              onClick={() => setIsCreateOpen(true)}
              disabled={!canCreateAgent}
              title={
                canCreateAgent
                  ? "Create agent"
                  : `Plan limit reached (${limit} agents)`
              }
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {agents.length}/{limit} agents
            {!canCreateAgent && limit === 1
              ? " · Upgrade to Pro for up to 5"
              : null}
          </p>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create agent</DialogTitle>
            <DialogDescription>
              Each agent has its own widget settings and embed snippet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-agent-name">Name</Label>
            <Input
              id="new-agent-name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder={`Agent ${agents.length + 1}`}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename agent</DialogTitle>
            <DialogDescription>
              This name is only used in the dashboard. Visitor-facing names come
              from theme settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-agent-name">Name</Label>
            <Input
              id="rename-agent-name"
              value={renameName}
              onChange={(event) => setRenameName(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRenameOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onRename} disabled={isRenaming}>
              {isRenaming ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
