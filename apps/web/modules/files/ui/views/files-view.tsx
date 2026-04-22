"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll"
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger"
import { useAction, usePaginatedQuery } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import type { PublicFile } from "@workspace/backend/private/files"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  AlertCircleIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  Clock3Icon,
  DatabaseIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileIcon,
  FileTextIcon,
  GlobeIcon,
  GridIcon,
  LayoutListIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  XIcon,
} from "lucide-react"
import { UploadDialog } from "../components/upload-dialog"
import { useMemo, useState } from "react"
import { DeleteFileDialog } from "../components/delete-file-dialog"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"

type ViewerPayload =
  | { kind: "text"; filename: string; sourceUrl?: string; content: string }
  | {
      kind: "document"
      filename: string
      sourceUrl?: string
      url: string | null
    }

type ViewMode = "list" | "grid"

// ─── helpers ──────────────────────────────────────────────────────────────────

function getFileIcon(type: string) {
  if (type === "url") return GlobeIcon
  if (["pdf"].includes(type)) return FileTextIcon
  return FileIcon
}

function getTypeBadgeVariant(
  type: string
): "default" | "secondary" | "outline" {
  if (type === "url") return "secondary"
  if (type === "pdf") return "default"
  return "outline"
}

function getStatusIcon(status: PublicFile["status"]) {
  if (status === "ready") return CheckCircle2Icon
  if (status === "processing") return Clock3Icon
  return AlertCircleIcon
}

function getStatusClass(status: PublicFile["status"]) {
  if (status === "ready") return "text-emerald-500"
  if (status === "processing") return "text-amber-500"
  return "text-destructive"
}

function getStatusLabel(status: PublicFile["status"]) {
  if (status === "ready") return "Indexed"
  if (status === "processing") return "Processing"
  return "Error"
}

// ─── empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
        <BookOpenIcon className="size-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="font-medium text-foreground">No knowledge sources yet</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Upload documents or add website URLs to power your AI assistant with
          accurate, up-to-date context.
        </p>
      </div>
      <Button onClick={onAdd} size="sm">
        <PlusIcon className="size-4" />
        Add First Source
      </Button>
    </div>
  )
}

// ─── empty search state ───────────────────────────────────────────────────────

function EmptySearch({
  query,
  onClear,
}: {
  query: string
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <SearchIcon className="size-8 text-muted-foreground/50" />
      <div className="space-y-1">
        <p className="font-medium">No results for &ldquo;{query}&rdquo;</p>
        <p className="text-sm text-muted-foreground">
          Try a different name or category.
        </p>
      </div>
      <Button onClick={onClear} size="sm" variant="outline">
        <XIcon className="size-4" />
        Clear search
      </Button>
    </div>
  )
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm leading-tight font-semibold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  )
}

// ─── file card (grid mode) ────────────────────────────────────────────────────

function FileCard({
  file,
  onView,
  onDelete,
}: {
  file: PublicFile
  onView: (file: PublicFile) => void
  onDelete: (file: PublicFile) => void
}) {
  const Icon = getFileIcon(file.type)
  const StatusIcon = getStatusIcon(file.status)

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      {/* header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="size-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              size="sm"
              variant="ghost"
            >
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void onView(file)}>
              <EyeIcon className="size-4" />
              View
            </DropdownMenuItem>
            {file.url && (
              <DropdownMenuItem asChild>
                <a href={file.url} rel="noreferrer" target="_blank">
                  <ExternalLinkIcon className="size-4" />
                  Open original
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(file)}
            >
              <TrashIcon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* name */}
      <div className="min-w-0">
        <p
          className="truncate text-sm leading-snug font-medium"
          title={file.name}
        >
          {file.name}
        </p>
        {file.category && (
          <p className="truncate text-xs text-muted-foreground">
            {file.category}
          </p>
        )}
      </div>

      {/* footer row */}
      <div className="flex items-center justify-between gap-2">
        <Badge className="uppercase" variant={getTypeBadgeVariant(file.type)}>
          {file.type}
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  getStatusClass(file.status)
                )}
              >
                <StatusIcon
                  className={cn(
                    "size-3.5",
                    file.status === "processing" && "animate-spin"
                  )}
                />
                {file.size !== "unknown" ? file.size : ""}
              </span>
            </TooltipTrigger>
            <TooltipContent>{getStatusLabel(file.status)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

// ─── skeleton loaders ─────────────────────────────────────────────────────────

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell className="px-6 py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-40" />
            </div>
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="h-5 w-14 rounded-full" />
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="px-6 py-4">
            <Skeleton className="size-8 rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function GridSkeletonCards() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border bg-card p-4"
        >
          <div className="flex items-start justify-between">
            <Skeleton className="size-10 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-4 w-10" />
          </div>
        </div>
      ))}
    </>
  )
}

// ─── main view ────────────────────────────────────────────────────────────────

export const FilesView = () => {
  const getViewerContent = useAction(
    (api as any).private.files.getViewerContent
  ) as (args: { entryId: string }) => Promise<ViewerPayload>

  const files = usePaginatedQuery(
    api.private.files.list,
    {},
    { initialNumItems: 20 }
  )

  const {
    topElementRef,
    handleLoadMore,
    canLoadMore,
    isLoadingFirstPage,
    isLoadingMore,
  } = useInfiniteScroll({
    status: files.status,
    loadMore: files.loadMore,
    loadSize: 20,
  })

  // ── local ui state ──────────────────────────────────────────────────────
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerFile, setViewerFile] = useState<PublicFile | null>(null)
  const [viewerPayload, setViewerPayload] = useState<ViewerPayload | null>(null)
  const [isViewerLoading, setIsViewerLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // ── derived data ────────────────────────────────────────────────────────
  const allFiles = files.results

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const f of allFiles) {
      if (f.category) set.add(f.category)
    }
    return Array.from(set).sort()
  }, [allFiles])

  const filtered = useMemo(() => {
    let list = allFiles
    if (activeCategory) list = list.filter((f) => f.category === activeCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q) ||
          f.category?.toLowerCase().includes(q)
      )
    }
    return list
  }, [allFiles, activeCategory, searchQuery])

  const stats = useMemo(() => {
    const total = allFiles.length
    const ready = allFiles.filter((f) => f.status === "ready").length
    const websites = allFiles.filter((f) => f.type === "url").length
    return { total, ready, websites }
  }, [allFiles])

  // ── handlers ────────────────────────────────────────────────────────────
  const handleDeleteClick = (file: PublicFile) => {
    setSelectedFile(file)
    setDeleteDialogOpen(true)
  }

  const handleViewClick = async (file: PublicFile) => {
    setViewerFile(file)
    setViewerOpen(true)
    setIsViewerLoading(true)
    setViewerPayload(null)
    try {
      const payload = await getViewerContent({ entryId: file.id })
      setViewerPayload(payload)
    } catch {
      toast.error("Unable to load document preview")
    } finally {
      setIsViewerLoading(false)
    }
  }

  const handleFileDeleted = () => setSelectedFile(null)

  const closeViewer = (open: boolean) => {
    setViewerOpen(open)
    if (!open) {
      setViewerFile(null)
      setViewerPayload(null)
      setIsViewerLoading(false)
    }
  }

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── dialogs ── */}
      <DeleteFileDialog
        file={selectedFile}
        onDeleted={handleFileDeleted}
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
      />
      <UploadDialog
        onOpenChange={setUploadDialogOpen}
        open={uploadDialogOpen}
      />

      {/* ── document viewer ── */}
      <Dialog onOpenChange={closeViewer} open={viewerOpen}>
        <DialogContent className="h-[90vh] max-w-[95vw] grid-rows-[auto,minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-base">
              {viewerFile &&
                (() => {
                  const Icon = getFileIcon(viewerFile.type)
                  return (
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                  )
                })()}
              <span className="truncate">
                {viewerFile?.name ?? "Document Viewer"}
              </span>
            </DialogTitle>
            {viewerPayload?.sourceUrl && (
              <DialogDescription className="flex items-center gap-1 truncate text-xs">
                <GlobeIcon className="size-3 shrink-0" />
                <a
                  className="truncate hover:underline"
                  href={viewerPayload.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {viewerPayload.sourceUrl}
                </a>
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="h-full min-h-0 bg-muted/30">
            {isViewerLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2Icon className="size-6 animate-spin" />
                <span className="text-sm">Loading preview…</span>
              </div>
            ) : viewerPayload?.kind === "text" ? (
              <div className="h-full overflow-auto p-6">
                <pre className="font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
                  {viewerPayload.content}
                </pre>
              </div>
            ) : viewerPayload?.kind === "document" && viewerPayload.url ? (
              <iframe
                className="h-full min-h-0 w-full border-0"
                src={viewerPayload.url}
                title={viewerPayload.filename}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileTextIcon className="size-8 opacity-40" />
                <span className="text-sm">
                  No preview available for this document.
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── page ── */}
      <div className="flex min-h-screen flex-col bg-muted/40">
        {/* page header */}
        <div className="border-b bg-background px-8 py-6">
          <div className="mx-auto max-w-screen-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  Knowledge Base
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Manage documents and websites powering your AI assistant.
                </p>
              </div>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <PlusIcon className="size-4" />
                Add Source
              </Button>
            </div>

            {/* stat cards */}
            {!isLoadingFirstPage && allFiles.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard
                  icon={DatabaseIcon}
                  label="Total sources"
                  value={stats.total}
                />
                <StatCard
                  icon={CheckCircle2Icon}
                  label="Indexed"
                  value={stats.ready}
                  sub={`${Math.round((stats.ready / stats.total) * 100)}% ready`}
                />
                <StatCard
                  icon={GlobeIcon}
                  label="Web pages"
                  value={stats.websites}
                  sub="scraped URLs"
                />
              </div>
            )}
          </div>
        </div>

        {/* toolbar */}
        <div className="border-b bg-background px-8 py-3">
          <div className="mx-auto flex max-w-screen-lg items-center gap-3">
            {/* search */}
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-9 pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, type or category…"
                value={searchQuery}
              />
              {searchQuery && (
                <button
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchQuery("")}
                  type="button"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>

            {/* category filter chips */}
            {categories.length > 0 && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <button
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    !activeCategory
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  )}
                  onClick={() => setActiveCategory(null)}
                  type="button"
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      activeCategory === cat
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    )}
                    onClick={() =>
                      setActiveCategory(activeCategory === cat ? null : cat)
                    }
                    type="button"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* view mode toggle */}
            <div className="flex items-center rounded-lg border bg-background p-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md transition-colors",
                        viewMode === "list"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setViewMode("list")}
                      type="button"
                    >
                      <LayoutListIcon className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>List view</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "flex size-7 items-center justify-center rounded-md transition-colors",
                        viewMode === "grid"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setViewMode("grid")}
                      type="button"
                    >
                      <GridIcon className="size-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Grid view</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* content */}
        <div className="flex-1 px-8 py-6">
          <div className="mx-auto max-w-screen-lg">
            {/* ── loading skeleton ── */}
            {isLoadingFirstPage ? (
              viewMode === "list" ? (
                <div className="overflow-hidden rounded-xl border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-6 py-3 font-medium">
                          Name
                        </TableHead>
                        <TableHead className="px-6 py-3 font-medium">
                          Type
                        </TableHead>
                        <TableHead className="px-6 py-3 font-medium">
                          Size
                        </TableHead>
                        <TableHead className="px-6 py-3 font-medium">
                          Status
                        </TableHead>
                        <TableHead className="px-6 py-3 font-medium" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableSkeletonRows />
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <GridSkeletonCards />
                </div>
              )
            ) : allFiles.length === 0 ? (
              /* ── truly empty ── */
              <div className="overflow-hidden rounded-xl border bg-background">
                <EmptyState onAdd={() => setUploadDialogOpen(true)} />
              </div>
            ) : filtered.length === 0 ? (
              /* ── filtered empty ── */
              <div className="overflow-hidden rounded-xl border bg-background">
                <EmptySearch
                  onClear={() => {
                    setSearchQuery("")
                    setActiveCategory(null)
                  }}
                  query={searchQuery || activeCategory || ""}
                />
              </div>
            ) : viewMode === "list" ? (
              /* ── list view ── */
              <div className="overflow-hidden rounded-xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="px-6 py-3 font-medium">
                        Name
                      </TableHead>
                      <TableHead className="px-6 py-3 font-medium">
                        Type
                      </TableHead>
                      <TableHead className="px-6 py-3 font-medium">
                        Size
                      </TableHead>
                      <TableHead className="px-6 py-3 font-medium">
                        Status
                      </TableHead>
                      <TableHead className="w-12 px-6 py-3" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((file) => {
                      const Icon = getFileIcon(file.type)
                      const StatusIcon = getStatusIcon(file.status)
                      return (
                        <TableRow
                          className="group cursor-default hover:bg-muted/40"
                          key={file.id}
                        >
                          <TableCell className="px-6 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Icon className="size-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p
                                  className="truncate text-sm font-medium"
                                  title={file.name}
                                >
                                  {file.name}
                                </p>
                                {file.category && (
                                  <p className="truncate text-xs text-muted-foreground">
                                    {file.category}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge
                              className="uppercase"
                              variant={getTypeBadgeVariant(file.type)}
                            >
                              {file.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3.5 text-sm text-muted-foreground">
                            {file.size !== "unknown" ? file.size : "—"}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "flex w-fit items-center gap-1.5 text-xs font-medium",
                                      getStatusClass(file.status)
                                    )}
                                  >
                                    <StatusIcon
                                      className={cn(
                                        "size-3.5",
                                        file.status === "processing" &&
                                          "animate-spin"
                                      )}
                                    />
                                    {getStatusLabel(file.status)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {file.status === "ready"
                                    ? "This source is indexed and available for AI search."
                                    : file.status === "processing"
                                      ? "Currently being processed and indexed."
                                      : "Indexing failed. Try re-uploading."}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  className="size-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                                  size="sm"
                                  variant="ghost"
                                >
                                  <MoreHorizontalIcon className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => void handleViewClick(file)}
                                >
                                  <EyeIcon className="size-4" />
                                  View content
                                </DropdownMenuItem>
                                {file.url && (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={file.url}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      <ExternalLinkIcon className="size-4" />
                                      Open original
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteClick(file)}
                                >
                                  <TrashIcon className="size-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {canLoadMore && (
                  <div className="border-t">
                    <InfiniteScrollTrigger
                      canLoadMore={canLoadMore}
                      isLoadingMore={isLoadingMore}
                      onLoadMore={handleLoadMore}
                      ref={topElementRef}
                    />
                  </div>
                )}
              </div>
            ) : (
              /* ── grid view ── */
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {filtered.map((file) => (
                    <FileCard
                      file={file}
                      key={file.id}
                      onDelete={handleDeleteClick}
                      onView={(f) => void handleViewClick(f)}
                    />
                  ))}
                </div>
                {canLoadMore && (
                  <div className="mt-4">
                    <InfiniteScrollTrigger
                      canLoadMore={canLoadMore}
                      isLoadingMore={isLoadingMore}
                      onLoadMore={handleLoadMore}
                      ref={topElementRef}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
