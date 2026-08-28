"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { Id } from "@workspace/backend/_generated/dataModel"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  WorkflowIcon,
} from "lucide-react"
import { toast } from "sonner"

type WorkflowRow = {
  id: Id<"workflows">
  name: string
  description: string | null
  updatedAt: number
  isActive: boolean
  publishedAt: number | null
}

const formatUpdated = (timestamp: number) => {
  const minutes = Math.round((Date.now() - timestamp) / 60_000)

  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

export const WorkflowsListView = () => {
  const router = useRouter()
  const workflows = useQuery(api.private.workflows.list) as
    | WorkflowRow[]
    | undefined
  const renameWorkflow = useMutation(api.private.workflows.rename)
  const duplicateWorkflow = useMutation(api.private.workflows.duplicate)
  const removeWorkflow = useMutation(api.private.workflows.remove)

  const [renaming, setRenaming] = useState<WorkflowRow | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [deleting, setDeleting] = useState<WorkflowRow | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => workflows ?? [], [workflows])

  const handleRename = async () => {
    if (!renaming || busy) return

    setBusy(true)
    try {
      await renameWorkflow({ workflowId: renaming.id, name: renameValue })
      toast.success("Workflow renamed")
      setRenaming(null)
    } catch {
      toast.error("Could not rename that workflow")
    } finally {
      setBusy(false)
    }
  }

  const handleDuplicate = async (workflow: WorkflowRow) => {
    if (busy) return

    setBusy(true)
    try {
      const copy = await duplicateWorkflow({ workflowId: workflow.id })
      toast.success(`${workflow.name} duplicated`)
      router.push(`/workflows/${copy.id as Id<"workflows">}`)
    } catch {
      toast.error("Could not duplicate that workflow")
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting || busy) return

    setBusy(true)
    try {
      await removeWorkflow({ workflowId: deleting.id })
      toast.success(`${deleting.name} deleted`)
      setDeleting(null)
    } catch (error) {
      // The backend refuses to delete the live workflow.
      const message =
        error instanceof Error && /Deactivate/.test(error.message)
          ? "Deactivate this workflow before deleting it."
          : "Could not delete that workflow"
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Deterministic conversation flows. The live one answers incoming
            conversations; the rest stay drafts until you publish them.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/workflows/new">
            <PlusIcon className="size-4" />
            New workflow
          </Link>
        </Button>
      </div>

      {workflows === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-8 py-16 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <WorkflowIcon className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">No workflows yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Build a flow of messages, questions and logic, then publish it to
              handle conversations automatically.
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/workflows/new">
              <PlusIcon className="size-4" />
              Create your first workflow
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-32">Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>
                    <Link
                      href={`/workflows/${workflow.id}`}
                      className="block max-w-md"
                    >
                      <span className="font-medium">{workflow.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {workflow.description || "No description"}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {workflow.isActive ? (
                      <Badge>Live</Badge>
                    ) : workflow.publishedAt ? (
                      <Badge variant="secondary">Published</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatUpdated(workflow.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Actions for ${workflow.name}`}
                        >
                          <MoreHorizontalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setRenaming(workflow)
                            setRenameValue(workflow.name)
                          }}
                        >
                          <PencilIcon className="size-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void handleDuplicate(workflow)}
                        >
                          <CopyIcon className="size-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={workflow.isActive}
                          onClick={() => setDeleting(workflow)}
                        >
                          <TrashIcon className="size-4" />
                          {workflow.isActive ? "Deactivate to delete" : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workflow</DialogTitle>
            <DialogDescription>
              This is the name shown here and in the builder.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleRename()
            }}
            placeholder="Workflow name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || !renameValue.trim()}
              onClick={() => void handleRename()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              This removes the workflow and its run history. It cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
