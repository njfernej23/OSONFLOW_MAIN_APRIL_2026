"use client";

import { useAuth } from "@clerk/nextjs";

import { useInfiniteScroll } from "@workspace/ui/hooks/use-infinite-scroll";
import { InfiniteScrollTrigger } from "@workspace/ui/components/infinite-scroll-trigger";
import { api } from "@workspace/backend/_generated/api";
import { Doc, Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { useAction, useMutation, useQuery } from "convex/react";
import { toUIMessages, useThreadMessages } from "@convex-dev/agent/react"
import { ArrowLeftIcon, MoreHorizontalIcon, PanelRightIcon, UserCheckIcon, UserXIcon, Wand2Icon } from "lucide-react";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { useRouter } from "next/navigation";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@workspace/ui/components/sheet";
import {
    AIConversation,
    AIConversationContent,
    AIConversationScrollButton,
} from '@workspace/ui/components/ai/conversation';
import { zodResolver } from "@hookform/resolvers/zod"
import {
    AIInput,
    AIInputButton,
    AIInputSubmit,
    AIInputTextarea,
    AIInputToolbar,
    AIInputTools,
} from '@workspace/ui/components/ai/input';
import {
    AIMessage,
    AIMessageContent,
} from '@workspace/ui/components/ai/message';
import { AIResponse } from '@workspace/ui/components/ai/response';
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";
import { Form, FormField } from '@workspace/ui/components/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { ConversationStatusButton } from "../components/conversation-status-button";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { ContactPanel } from "../components/contact-panel";




const formSchema = z.object({
    message: z.string().min(1, "Message is required"),
});

type SavedReplyDoc = Doc<"savedReplies">;

const normalizeSavedReplySearch = (value: string) => value.trim().toLowerCase();

const renderSavedReplyWithContact = ({
    body,
    contactName,
    contactEmail,
}: {
    body: string;
    contactName: string;
    contactEmail: string;
}) => {
    return body
        .replace(/{{\s*(name|customer_name)\s*}}/gi, contactName)
        .replace(/{{\s*(email|customer_email)\s*}}/gi, contactEmail);
};


export const ConversationIdView = ({
    conversationId,
}: {
    conversationId: Id<"conversations">,
}) => {
    const { userId } = useAuth();
    const isMobile = useIsMobile();
    const router = useRouter();

    const conversation = useQuery(api.private.conversations.getOne, {
        conversationId,
    })


    const messages = useThreadMessages(
        api.private.messages.getMany,
        conversation?.threadId ? { threadId: conversation.threadId } : "skip",
        { initialNumItems: 10, }
    );


    const {
        topElementRef,
        handleLoadMore,
        canLoadMore,
        isLoadingMore,
    } = useInfiniteScroll({
        status: messages.status,
        loadMore: messages.loadMore,
        loadSize: 10,
    });


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            message: "",
        },
    });

    const [isEnhancing, setIsEnhancing] = useState(false);

    const enhanceResponse = useAction(api.private.messages.enhanceResponse);
    const handleEnhanceResponse = async () => {
        setIsEnhancing(true)
        const currentValue = form.getValues("message");

        try {
            const response = await enhanceResponse({ prompt: currentValue });

            form.setValue('message', response);
        } catch (error) {
            toast.error("Something went wrong")
            console.error(error);
        } finally {
            setIsEnhancing(false)
        }
    }


    const createMessage = useMutation(api.private.messages.create);

    const savedReplies = useQuery(api.private.savedReplies.getMany, {
        limit: 100,
    });

    const createSavedReply = useMutation(api.private.savedReplies.create);
    const updateSavedReply = useMutation(api.private.savedReplies.update);
    const removeSavedReply = useMutation(api.private.savedReplies.remove);
    const incrementSavedReplyUsage = useMutation(api.private.savedReplies.incrementUsage);

    const [isSavedRepliesDialogOpen, setIsSavedRepliesDialogOpen] = useState(false);
    const [editingSavedReplyId, setEditingSavedReplyId] = useState<Id<"savedReplies"> | null>(null);
    const [savedReplyTitle, setSavedReplyTitle] = useState("");
    const [savedReplyBody, setSavedReplyBody] = useState("");
    const [savedReplyCategory, setSavedReplyCategory] = useState("");
    const [isSavingSavedReply, setIsSavingSavedReply] = useState(false);
    const [deletingSavedReplyId, setDeletingSavedReplyId] = useState<Id<"savedReplies"> | null>(null);
    const [activeSlashIndex, setActiveSlashIndex] = useState(0);
    const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);

    const currentMessage = form.watch("message");
    const normalizedMessage = currentMessage.trimStart();
    const isSlashMode = normalizedMessage.startsWith("/");
    const slashSearchTerm = isSlashMode
        ? normalizeSavedReplySearch(normalizedMessage.slice(1))
        : "";

    const slashMatches = useMemo(() => {
        if (!isSlashMode || !savedReplies) {
            return [] as SavedReplyDoc[];
        }

        if (!slashSearchTerm) {
            return savedReplies.slice(0, 5);
        }

        return savedReplies
            .filter((savedReply) => {
                const searchableText = [
                    savedReply.title,
                    savedReply.body,
                    savedReply.category,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

                return searchableText.includes(slashSearchTerm);
            })
            .slice(0, 5);
    }, [isSlashMode, savedReplies, slashSearchTerm]);

    useEffect(() => {
        if (!isSlashMode) {
            setActiveSlashIndex(0);
            return;
        }

        setActiveSlashIndex(0);
    }, [isSlashMode, slashSearchTerm]);

    useEffect(() => {
        if (slashMatches.length === 0) {
            setActiveSlashIndex(0);
            return;
        }

        setActiveSlashIndex((previous) =>
            Math.min(previous, slashMatches.length - 1)
        );
    }, [slashMatches.length]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        if (values.message.trimStart().startsWith("/")) {
            toast.error("Select a saved reply before sending");
            return;
        }

        try {
            await createMessage({
                conversationId,
                prompt: values.message,
            });

            form.reset();
        } catch (error) {
            console.error(error);
        }
    };

    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const updateConversationStatus = useMutation(api.private.conversations.updateStatus);
    const [isUpdatingAssignment, setIsUpdatingAssignment] = useState(false);
    const updateConversationAssignment = useMutation(api.private.conversations.updateAssignment);

    const handleToggleStatus = async () => {
        if (!conversation) {
            return;
        }

        setIsUpdatingStatus(true)

        let newStatus: "unresolved" | "resolved" | "escalated";

        if (conversation.status === "unresolved") {
            newStatus = "escalated";
        } else if (conversation.status === "escalated") {
            newStatus = "resolved";
        } else {
            newStatus = "unresolved";
        }

        try {
            await updateConversationStatus({
                conversationId,
                status: newStatus,
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsUpdatingStatus(false)
        }
    };

    const handleUpdateAssignment = async (
        action: "assign_to_me" | "take_over" | "unassign",
    ) => {
        if (!conversation) {
            return;
        }

        setIsUpdatingAssignment(true);

        try {
            await updateConversationAssignment({
                conversationId,
                action,
            });
        } catch (error) {
            toast.error("Failed to update assignment");
            console.error(error);
        } finally {
            setIsUpdatingAssignment(false);
        }
    };

    if (conversation === undefined || messages.status === "LoadingFirstPage") {
        return <ConversationIdViewLoading />
    }

    const savedRepliesList = savedReplies ?? [];

    const resetSavedReplyForm = () => {
        setEditingSavedReplyId(null);
        setSavedReplyTitle("");
        setSavedReplyBody("");
        setSavedReplyCategory("");
    };

    const startEditingSavedReply = (savedReply: SavedReplyDoc) => {
        setEditingSavedReplyId(savedReply._id);
        setSavedReplyTitle(savedReply.title);
        setSavedReplyBody(savedReply.body);
        setSavedReplyCategory(savedReply.category ?? "");
    };

    const handleSaveSavedReply = async () => {
        const title = savedReplyTitle.trim();
        const body = savedReplyBody.trim();

        if (!title || !body) {
            toast.error("Title and message are required");
            return;
        }

        setIsSavingSavedReply(true);

        try {
            if (editingSavedReplyId) {
                await updateSavedReply({
                    savedReplyId: editingSavedReplyId,
                    title,
                    body,
                    category: savedReplyCategory.trim() || undefined,
                });
                toast.success("Saved reply updated");
            } else {
                await createSavedReply({
                    title,
                    body,
                    category: savedReplyCategory.trim() || undefined,
                });
                toast.success("Saved reply created");
            }

            resetSavedReplyForm();
        } catch (error) {
            toast.error("Failed to save reply template");
            console.error(error);
        } finally {
            setIsSavingSavedReply(false);
        }
    };

    const handleDeleteSavedReply = async (savedReplyId: Id<"savedReplies">) => {
        setDeletingSavedReplyId(savedReplyId);

        try {
            await removeSavedReply({ savedReplyId });
            if (editingSavedReplyId === savedReplyId) {
                resetSavedReplyForm();
            }
            toast.success("Saved reply deleted");
        } catch (error) {
            toast.error("Failed to delete saved reply");
            console.error(error);
        } finally {
            setDeletingSavedReplyId(null);
        }
    };

    const applySavedReply = async (
        savedReply: SavedReplyDoc,
        options?: { closeManager?: boolean },
    ) => {
        const renderedBody = renderSavedReplyWithContact({
            body: savedReply.body,
            contactName: conversation.contactSession.name,
            contactEmail: conversation.contactSession.email,
        });

        form.setValue("message", renderedBody, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        });

        try {
            await incrementSavedReplyUsage({
                savedReplyId: savedReply._id,
            });
        } catch (error) {
            console.error(error);
        }

        if (options?.closeManager) {
            setIsSavedRepliesDialogOpen(false);
        }
    };

    const isAssignedToMe = !!userId && conversation.assignedToId === userId;
    const assignmentLabel = !conversation.assignedToId
        ? "Unassigned"
        : isAssignedToMe
            ? "Assigned to me"
            : `Assigned: ${conversation.assignedToName ?? "Operator"}`;


    return (
        <div className="flex h-full flex-col bg-muted/40">
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                {/* Back button on mobile */}
                {isMobile && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 p-1.5"
                        onClick={() => router.push("/conversations")}
                    >
                        <ArrowLeftIcon className="size-4" />
                    </Button>
                )}
                {/* Contact identity */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <DicebearAvatar
                        seed={conversation.contactSession._id}
                        size={32}
                        className="shrink-0"
                    />
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                            {conversation.contactSession.name}
                        </p>
                        <p className="truncate text-[11px] leading-tight text-muted-foreground">
                            {conversation.contactSession.email}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1.5">
                    {isMobile && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0"
                            onClick={() => setIsContactPanelOpen(true)}
                        >
                            <PanelRightIcon className="size-4" />
                        </Button>
                    )}
                    <Badge
                        className="hidden h-5 px-1.5 text-[11px] sm:inline-flex"
                        variant={isAssignedToMe ? "default" : "outline"}
                    >
                        {assignmentLabel}
                    </Badge>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                disabled={isUpdatingAssignment}
                                size="sm"
                                variant="ghost"
                                className="size-7 p-0"
                            >
                                <MoreHorizontalIcon className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            {!conversation.assignedToId ? (
                                <DropdownMenuItem
                                    disabled={isUpdatingAssignment}
                                    onClick={() => void handleUpdateAssignment("assign_to_me")}
                                >
                                    <UserCheckIcon />
                                    Assign to me
                                </DropdownMenuItem>
                            ) : !isAssignedToMe ? (
                                <DropdownMenuItem
                                    disabled={isUpdatingAssignment}
                                    onClick={() => void handleUpdateAssignment("take_over")}
                                >
                                    <UserCheckIcon />
                                    Take over
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem disabled>
                                    <UserCheckIcon />
                                    Assigned to you
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                disabled={!conversation.assignedToId || isUpdatingAssignment}
                                onClick={() => void handleUpdateAssignment("unassign")}
                            >
                                <UserXIcon />
                                Unassign
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {!!conversation && (
                        <ConversationStatusButton
                            status={conversation?.status}
                            onClick={handleToggleStatus}
                            disabled={isUpdatingStatus}
                        />
                    )}
                </div>
            </header>

            <Sheet open={isContactPanelOpen} onOpenChange={setIsContactPanelOpen}>
                <SheetContent side="right" className="w-[min(90vw,360px)] p-0">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Contact details</SheetTitle>
                    </SheetHeader>
                    <ContactPanel />
                </SheetContent>
            </Sheet>

            <AIConversation className="max-h-[calc(100vh-180px)] px-2 pb-1 pt-2">
                <AIConversationContent>
                    <InfiniteScrollTrigger
                        canLoadMore={canLoadMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={handleLoadMore}
                        ref={topElementRef}
                    />
                    {toUIMessages(messages.results ?? [])?.map((message) => (
                        <AIMessage
                            // In reverse, because we are watching from "assistant" perspective
                            from={message.role === "user" ? "assistant" : "user"}
                            key={message.id}
                        >
                            <AIMessageContent>
                                <AIResponse>
                                    {message.content}
                                </AIResponse>
                            </AIMessageContent>
                            {message.role === "user" && (
                                <DicebearAvatar
                                    seed={conversation?.contactSessionId ?? "user"}
                                    size={32}
                                />
                            )}
                        </AIMessage>
                    ))}

                </AIConversationContent>
                <AIConversationScrollButton />
            </AIConversation>
            <div className="border-t bg-background/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <Form {...form}>
                    <AIInput
                        className="shadow-sm ring-1 ring-border transition-shadow duration-200 focus-within:ring-primary/30"
                        onSubmit={form.handleSubmit(onSubmit)}
                    >
                        <FormField
                            control={form.control}
                            disabled={conversation?.status === "resolved"}
                            name="message"
                            render={({ field }) => (
                                <AIInputTextarea
                                    className="min-h-[84px]"
                                    disabled={
                                        conversation?.status === "resolved" ||
                                        form.formState.isSubmitting ||
                                        isEnhancing
                                    }
                                    onChange={field.onChange}
                                    onKeyDown={(e) => {
                                        if (isSlashMode) {
                                            if (e.key === "ArrowDown") {
                                                e.preventDefault();
                                                if (slashMatches.length > 0) {
                                                    setActiveSlashIndex(
                                                        (previous) => (previous + 1) % slashMatches.length
                                                    );
                                                }
                                                return;
                                            }

                                            if (e.key === "ArrowUp") {
                                                e.preventDefault();
                                                if (slashMatches.length > 0) {
                                                    setActiveSlashIndex(
                                                        (previous) =>
                                                            (previous - 1 + slashMatches.length) %
                                                            slashMatches.length
                                                    );
                                                }
                                                return;
                                            }

                                            if (e.key === "Escape") {
                                                e.preventDefault();
                                                form.setValue("message", "", {
                                                    shouldDirty: true,
                                                    shouldTouch: true,
                                                    shouldValidate: true,
                                                });
                                                return;
                                            }
                                        }

                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();

                                            if (isSlashMode) {
                                                const selectedMatch =
                                                    slashMatches[activeSlashIndex] ?? slashMatches[0];

                                                if (selectedMatch) {
                                                    void applySavedReply(selectedMatch);
                                                } else {
                                                    toast.error("No saved reply matches this shortcut");
                                                }
                                                return;
                                            }

                                            form.handleSubmit(onSubmit)();
                                        }
                                    }}
                                    placeholder={
                                        conversation?.status === "resolved"
                                            ? "This conversation has been resolved"
                                            : "Type your response as an operator..."
                                    }
                                    value={field.value}
                                />
                            )}
                        />

                        {isSlashMode && (
                            <div className="border-t bg-gradient-to-b from-muted/40 to-background p-2.5">
                                <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        Saved replies
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground">
                                            ↑↓ navigate
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            Enter insert
                                        </span>
                                        <Button
                                            className="h-6"
                                            onClick={() => setIsSavedRepliesDialogOpen(true)}
                                            size="xs"
                                            type="button"
                                            variant="ghost"
                                        >
                                            Manage
                                        </Button>
                                    </div>
                                </div>

                                {slashMatches.length === 0 ? (
                                    <p className="rounded-md border border-dashed px-2 py-2 text-muted-foreground text-xs">
                                        No matches. Open Templates to create one.
                                    </p>
                                ) : (
                                    <div className="max-h-40 space-y-1 overflow-y-auto pr-0.5">
                                        {slashMatches.map((savedReply, index) => (
                                            <button
                                                aria-selected={index === activeSlashIndex}
                                                className={cn(
                                                    "w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                                                    index === activeSlashIndex
                                                        ? "border-primary/30 bg-primary/5"
                                                        : "border-transparent hover:border-border hover:bg-background"
                                                )}
                                                key={savedReply._id}
                                                onMouseEnter={() => setActiveSlashIndex(index)}
                                                onClick={() => void applySavedReply(savedReply)}
                                                type="button"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate font-medium text-xs">
                                                        {savedReply.title}
                                                    </span>
                                                    {savedReply.category && (
                                                        <Badge className="h-4 px-1.5 text-[10px]" variant="outline">
                                                            {savedReply.category}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 line-clamp-1 text-muted-foreground text-[11px]">
                                                    {savedReply.body}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <AIInputToolbar className="bg-muted/10">
                            <AIInputTools>
                                <AIInputButton
                                    onClick={() => setIsSavedRepliesDialogOpen(true)}
                                    disabled={conversation?.status === 'resolved'}
                                    size="default"
                                >
                                    Templates
                                </AIInputButton>
                                <AIInputButton
                                    onClick={handleEnhanceResponse}
                                    disabled={
                                        conversation?.status === 'resolved' || isEnhancing || !form.formState.isValid
                                    }
                                >
                                    <Wand2Icon />
                                    {isEnhancing ? 'Enhancing...' : 'Enhance'}
                                </AIInputButton>
                            </AIInputTools>
                            <AIInputSubmit
                                disabled={
                                    conversation?.status === "resolved" ||
                                    !form.formState.isValid ||
                                    form.formState.isSubmitting ||
                                    isEnhancing
                                }
                                status="ready"
                                type="submit"
                            />
                        </AIInputToolbar>

                    </AIInput>
                </Form>
            </div>

            <Dialog
                onOpenChange={(open) => {
                    setIsSavedRepliesDialogOpen(open);
                    if (!open) {
                        resetSavedReplyForm();
                    }
                }}
                open={isSavedRepliesDialogOpen}
            >
                <DialogContent className="max-w-[720px] gap-3 p-5">
                    <DialogHeader>
                        <DialogTitle>Saved Replies</DialogTitle>
                        <DialogDescription>
                            Use in composer with / shortcut. Placeholders supported: {"{{name}}"} and {"{{email}}"}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2 rounded-lg border bg-muted/20 p-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="saved-reply-title">Title</Label>
                            <Input
                                id="saved-reply-title"
                                onChange={(event) => setSavedReplyTitle(event.target.value)}
                                placeholder="Password reset"
                                value={savedReplyTitle}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="saved-reply-category">Category (optional)</Label>
                            <Input
                                id="saved-reply-category"
                                onChange={(event) => setSavedReplyCategory(event.target.value)}
                                placeholder="billing"
                                value={savedReplyCategory}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="saved-reply-body">Message</Label>
                            <Textarea
                                id="saved-reply-body"
                                onChange={(event) => setSavedReplyBody(event.target.value)}
                                placeholder="Hi {{name}}, here is your reset link..."
                                value={savedReplyBody}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            {!!editingSavedReplyId && (
                                <Button
                                    onClick={resetSavedReplyForm}
                                    type="button"
                                    variant="outline"
                                >
                                    Cancel edit
                                </Button>
                            )}

                            <Button
                                disabled={isSavingSavedReply}
                                onClick={() => void handleSaveSavedReply()}
                                type="button"
                            >
                                {isSavingSavedReply
                                    ? "Saving..."
                                    : editingSavedReplyId
                                        ? "Update reply"
                                        : "Create reply"}
                            </Button>
                        </div>
                    </div>

                    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                        {savedRepliesList.length === 0 ? (
                            <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
                                No saved replies yet.
                            </div>
                        ) : (
                            savedRepliesList.map((savedReply) => {
                                const isDeleting = deletingSavedReplyId === savedReply._id;

                                return (
                                    <div
                                        className="rounded-lg border bg-background p-3 transition-colors hover:border-primary/20 hover:bg-muted/20"
                                        key={savedReply._id}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className="truncate font-medium text-sm">
                                                        {savedReply.title}
                                                    </span>
                                                    {savedReply.category && (
                                                        <Badge className="h-4 px-1.5 text-[10px]" variant="outline">
                                                            {savedReply.category}
                                                        </Badge>
                                                    )}
                                                    <Badge className="h-4 px-1.5 text-[10px]" variant="secondary">
                                                        Used {savedReply.usageCount}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                                                    {savedReply.body}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-1">
                                                <Button
                                                    onClick={() => void applySavedReply(savedReply, { closeManager: true })}
                                                    size="xs"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Use
                                                </Button>
                                                <Button
                                                    onClick={() => startEditingSavedReply(savedReply)}
                                                    size="xs"
                                                    type="button"
                                                    variant="ghost"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    disabled={isDeleting}
                                                    onClick={() => void handleDeleteSavedReply(savedReply._id)}
                                                    size="xs"
                                                    type="button"
                                                    variant="destructive"
                                                >
                                                    {isDeleting ? "Deleting..." : "Delete"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};







export const ConversationIdViewLoading = () => {
    return (
        <div className="flex h-full flex-col bg-muted">
            <header className="flex items-center justify-between border-b bg-background p-2.5">
                <Button disabled size="sm" variant="ghost">
                    <MoreHorizontalIcon />
                </Button>
                <Skeleton className="h-8 w-24 rounded-md" />
            </header>
            <AIConversation className="max-h-[calc(100vh-180px)]">
                <AIConversationContent>
                    {Array.from({ length: 6 }, (_, index) => {
                        // Alternate between assistant (left, with avatar) and user (right, no avatar)
                        const isAssistant = index % 2 === 0;
                        const widths = ["w-48", "w-64", "w-56", "w-72", "w-60", "w-52"];
                        return (
                            <AIMessage
                                from={isAssistant ? "assistant" : "user"}
                                key={index}
                            >
                                <AIMessageContent>
                                    <div className="space-y-2">
                                        <Skeleton className={cn("h-4", widths[index])} />
                                        {index % 3 === 0 && (
                                            <Skeleton className="h-4 w-40" />
                                        )}
                                    </div>
                                </AIMessageContent>
                                {isAssistant && (
                                    <Skeleton className="size-8 shrink-0 rounded-full" />
                                )}
                            </AIMessage>
                        )
                    })}
                </AIConversationContent>
            </AIConversation>

            <div className="p-2">
                <AIInput>
                    <AIInputTextarea
                        disabled
                        placeholder="Type your response as an operator..."
                    />
                    <AIInputToolbar>
                        <AIInputTools />
                        <AIInputSubmit disabled status="ready" />
                    </AIInputToolbar>
                </AIInput>
            </div>
        </div>
    )
}