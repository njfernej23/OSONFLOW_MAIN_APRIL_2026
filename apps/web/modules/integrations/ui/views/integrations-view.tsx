"use client";

import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import {
    ActivityIcon,
    CheckCircle2Icon,
    ChevronDownIcon,
    ChevronRightIcon,
    CopyIcon,
    KeyRoundIcon,
    Loader2Icon,
    PlugZapIcon,
    RefreshCwIcon,
    Trash2Icon,
    WebhookIcon,
    XCircleIcon,
    ZapIcon,
} from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";
import {
    DEFAULT_WIDGET_SCRIPT_URL,
    type IntegrationId,
    INTEGRATIONS,
    type WebhookEventType,
    type WebhookProvider,
    WEBHOOK_EVENT_TYPES,
    WEBHOOK_PROVIDERS,
    type WidgetPosition,
    WIDGET_POSITIONS,
} from "../../constants";
import { createScript, isValidWidgetScriptUrl, normalizeScriptUrl } from "../../utils";

type WebhookDestination = {
    _id: string;
    _creationTime: number;
    url: string;
    description?: string;
    provider: WebhookProvider;
    providerConfigPreview?: {
        telegramChatId?: string;
        hasTelegramBotToken?: boolean;
        whatsappPhoneNumberId?: string;
        whatsappRecipientPhone?: string;
        hasWhatsappAccessToken?: boolean;
    };
    isEnabled: boolean;
    eventTypes: WebhookEventType[];
    updatedAt: number;
    signingSecretPreview: string;
};

type WebhookDelivery = {
    _id: string;
    _creationTime: number;
    webhookId: string;
    webhookUrl: string;
    eventId: string;
    eventType: WebhookEventType;
    status: "success" | "failed";
    attempt: number;
    responseStatus?: number;
    responseBody?: string;
    error?: string;
    durationMs?: number;
};

type WebhookDashboard = {
    webhooks: WebhookDestination[];
    deliveries: WebhookDelivery[];
};

const webhookEventTypeById = WEBHOOK_EVENT_TYPES.reduce(
    (acc, e) => { acc[e.id] = e; return acc; },
    {} as Record<WebhookEventType, (typeof WEBHOOK_EVENT_TYPES)[number]>
);
const webhookProviderById = WEBHOOK_PROVIDERS.reduce(
    (acc, p) => { acc[p.id] = p; return acc; },
    {} as Record<WebhookProvider, (typeof WEBHOOK_PROVIDERS)[number]>
);

const formatEventTypeLabel = (e: WebhookEventType) => webhookEventTypeById[e]?.label ?? e;
const formatWebhookProviderLabel = (p: WebhookProvider) => webhookProviderById[p]?.label ?? p;
const formatTimeAgo = (ts: number) => formatDistanceToNow(ts, { addSuffix: true });
const DELIVERY_HISTORY_VISIBLE_COUNT = 10;

const PROVIDER_IMAGE_SRC: Partial<Record<WebhookProvider, string>> = {
    discord: "/discord.png",
    telegram: "/telegram.png",
    whatsapp: "/whatsapp.png",
};

const ProviderIcon = ({ provider, size = 24 }: { provider: WebhookProvider; size?: number }) => {
    const src = PROVIDER_IMAGE_SRC[provider];
    if (src) {
        return <Image alt={formatWebhookProviderLabel(provider)} src={src} width={size} height={size} className="rounded-sm object-contain" />;
    }
    return <WebhookIcon style={{ width: size, height: size }} className="text-muted-foreground" />;
};

// Simple token-class syntax highlighter for generated snippets
const tokenizeSnippet = (code: string): { text: string; cls: string }[] => {
    const tokens: { text: string; cls: string }[] = [];
    const regex = /(\/\/[^\n]*|<!--[\s\S]*?-->|"[^"]*"|'[^']*'|`[^`]*`|<\/?[A-Za-z][A-Za-z0-9.]*|\/?>|import|export|const|return|function|async|await|useEffect|null|undefined|true|false|[A-Za-z_$][A-Za-z0-9_$.]*\s*(?=\()|[{}[\]();,])/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(code)) !== null) {
        if (match.index > last) tokens.push({ text: code.slice(last, match.index), cls: "text-zinc-300" });
        const t = match[0];
        let cls = "text-zinc-300";
        if (/^(\/\/|<!--)/.test(t)) cls = "text-zinc-500 italic";
        else if (/^["'`]/.test(t) || /^"[^"]*"$/.test(t)) cls = "text-amber-300";
        else if (/^<\/?[A-Za-z]|[/>]>?$/.test(t)) cls = "text-emerald-400";
        else if (/^(import|export|const|return|function|async|await|useEffect|null|undefined|true|false)$/.test(t)) cls = "text-sky-400";
        else if (/^[A-Za-z_$][A-Za-z0-9_$.]*\s*\($/.test(t)) cls = "text-yellow-300";
        else if (/^[{}[\]();,]$/.test(t)) cls = "text-zinc-500";
        tokens.push({ text: t, cls });
        last = match.index + t.length;
    }
    if (last < code.length) tokens.push({ text: code.slice(last), cls: "text-zinc-300" });
    return tokens;
};

const EmptyWebhooksState = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center gap-4">
        <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="text-muted-foreground/20">
            <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 4" />
            <path d="M28 40h8M44 40h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="40" cy="40" r="4" fill="currentColor" />
            <path d="M40 16v6M40 58v6M16 40h6M58 40h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
        <div>
            <p className="text-sm font-medium text-muted-foreground">No destinations yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Create your first webhook on the left.</p>
        </div>
    </div>
);

const EmptyDeliveriesState = () => (
    <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
        <svg width="64" height="64" viewBox="0 0 80 80" fill="none" className="text-muted-foreground/20">
            <rect x="16" y="24" width="48" height="32" rx="4" stroke="currentColor" strokeWidth="2.5" />
            <path d="M16 34h48" stroke="currentColor" strokeWidth="2" />
            <path d="M28 44h8M28 50h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <circle cx="56" cy="47" r="5" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        </svg>
        <div>
            <p className="text-sm font-medium text-muted-foreground">No deliveries recorded</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Deliveries appear here after your first webhook fires.</p>
        </div>
    </div>
);

type ActiveSection = "widget" | "webhooks";

export const IntegrationsView = () => {
    const { organization } = useOrganization();

    const [activeSection, setActiveSection] = useState<ActiveSection>("widget");
    const [selectedIntegration, setSelectedIntegration] = useState<IntegrationId>("html5");
    const [scriptUrl, setScriptUrl] = useState(DEFAULT_WIDGET_SCRIPT_URL);
    const [position, setPosition] = useState<WidgetPosition>("bottom-right");
    const [snippetCopied, setSnippetCopied] = useState(false);

    const [selectedWebhookProvider, setSelectedWebhookProvider] = useState<WebhookProvider>("discord");
    const [webhookUrl, setWebhookUrl] = useState<string>(webhookProviderById.discord.defaultUrl);
    const [webhookDescription, setWebhookDescription] = useState("");
    const [telegramBotToken, setTelegramBotToken] = useState("");
    const [telegramChatId, setTelegramChatId] = useState("");
    const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
    const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
    const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState("");
    const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<WebhookEventType[]>(
        WEBHOOK_EVENT_TYPES.map((e) => e.id)
    );
    const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
    const [isClearingDeliveryHistory, setIsClearingDeliveryHistory] = useState(false);
    const [loadingWebhookId, setLoadingWebhookId] = useState<string | null>(null);
    const [latestSigningSecret, setLatestSigningSecret] = useState<string | null>(null);
    const [expandedWebhookId, setExpandedWebhookId] = useState<string | null>(null);

    const normalizedScriptUrl = useMemo(() => normalizeScriptUrl(scriptUrl), [scriptUrl]);
    const scriptUrlIsValid = useMemo(() => isValidWidgetScriptUrl(normalizedScriptUrl), [normalizedScriptUrl]);
    const selectedIntegrationItem = useMemo(
        () => INTEGRATIONS.find((i) => i.id === selectedIntegration),
        [selectedIntegration]
    );
    const selectedWebhookProviderItem = useMemo(
        () => webhookProviderById[selectedWebhookProvider],
        [selectedWebhookProvider]
    );

    const snippet = useMemo(() => {
        if (!organization?.id) return "";
        return createScript(selectedIntegration, {
            organizationId: organization.id,
            scriptUrl: normalizedScriptUrl,
            position,
        });
    }, [organization?.id, selectedIntegration, normalizedScriptUrl, position]);

    const snippetTokens = useMemo(() => tokenizeSnippet(snippet), [snippet]);

    const webhookDashboard = useQuery(
        (api as any).private.integrationWebhooks.getDashboard, {}
    ) as WebhookDashboard | undefined;

    const createWebhook = useMutation((api as any).private.integrationWebhooks.createWebhook) as (args: {
        url?: string; description?: string; provider: WebhookProvider;
        providerConfig?: { telegramBotToken?: string; telegramChatId?: string; whatsappAccessToken?: string; whatsappPhoneNumberId?: string; whatsappRecipientPhone?: string; };
        eventTypes: WebhookEventType[];
    }) => Promise<{ webhookId: string; signingSecret: string }>;

    const updateWebhook = useMutation((api as any).private.integrationWebhooks.updateWebhook) as (args: {
        webhookId: string; isEnabled?: boolean; url?: string; description?: string;
        eventTypes?: WebhookEventType[]; provider?: WebhookProvider;
        providerConfig?: { telegramBotToken?: string; telegramChatId?: string; whatsappAccessToken?: string; whatsappPhoneNumberId?: string; whatsappRecipientPhone?: string; };
    }) => Promise<void>;

    const rotateSigningSecret = useMutation((api as any).private.integrationWebhooks.rotateSigningSecret) as (args: { webhookId: string }) => Promise<{ signingSecret: string }>;
    const removeWebhook = useMutation((api as any).private.integrationWebhooks.removeWebhook) as (args: { webhookId: string }) => Promise<void>;
    const clearDeliveryHistory = useMutation((api as any).private.integrationWebhooks.clearDeliveryHistory) as (args: { webhookId?: string }) => Promise<{ deletedCount: number; hasMore: boolean }>;

    const copyText = async (value: string, successMessage: string, errorMessage: string) => {
        try { await navigator.clipboard.writeText(value); toast.success(successMessage); }
        catch { toast.error(errorMessage); }
    };

    const handleCopyOrganizationId = async () => {
        if (!organization?.id) { toast.error("Organization ID not found"); return; }
        await copyText(organization.id, "Organization ID copied", "Failed to copy organization ID");
    };

    const handleCopySnippet = async () => {
        if (!snippet) { toast.error("Generate a snippet first"); return; }
        try {
            await navigator.clipboard.writeText(snippet);
            toast.success("Snippet copied to clipboard");
            setSnippetCopied(true);
            setTimeout(() => setSnippetCopied(false), 2000);
        } catch { toast.error("Failed to copy snippet"); }
    };

    const handleCreateWebhook = async () => {
        const normalizedUrl = webhookUrl.trim();
        const isUrlRequired =
            selectedWebhookProvider === "webhook" || selectedWebhookProvider === "discord";
        if (isUrlRequired && !normalizedUrl) { toast.error("Destination URL is required"); return; }
        if (selectedWebhookProvider === "telegram" && (!telegramBotToken.trim() || !telegramChatId.trim())) {
            toast.error("Telegram requires bot token and chat ID"); return;
        }
        if (selectedWebhookProvider === "whatsapp" && (!whatsappAccessToken.trim() || !whatsappPhoneNumberId.trim() || !whatsappRecipientPhone.trim())) {
            toast.error("WhatsApp requires access token, phone number ID, and recipient"); return;
        }
        if (selectedWebhookEvents.length === 0) { toast.error("Select at least one event type"); return; }

        setIsCreatingWebhook(true);
        try {
            const providerConfig = selectedWebhookProvider === "telegram"
                ? { telegramBotToken: telegramBotToken.trim(), telegramChatId: telegramChatId.trim() }
                : selectedWebhookProvider === "whatsapp"
                    ? { whatsappAccessToken: whatsappAccessToken.trim(), whatsappPhoneNumberId: whatsappPhoneNumberId.trim(), whatsappRecipientPhone: whatsappRecipientPhone.trim() }
                    : undefined;

            const result = await createWebhook({
                url: normalizedUrl || undefined,
                description: webhookDescription.trim() || undefined,
                provider: selectedWebhookProvider,
                providerConfig,
                eventTypes: selectedWebhookEvents,
            });
            setLatestSigningSecret(result.signingSecret);
            setWebhookUrl(selectedWebhookProviderItem.defaultUrl);
            setWebhookDescription("");
            setTelegramBotToken(""); setTelegramChatId("");
            setWhatsappAccessToken(""); setWhatsappPhoneNumberId(""); setWhatsappRecipientPhone("");
            toast.success("Webhook destination created");
        } catch { toast.error("Failed to create webhook destination"); }
        finally { setIsCreatingWebhook(false); }
    };

    const handleToggleWebhookEvent = (eventType: WebhookEventType) => {
        setSelectedWebhookEvents((prev) =>
            prev.includes(eventType) ? prev.filter((v) => v !== eventType) : [...prev, eventType]
        );
    };

    const handleWebhookProviderChange = (provider: WebhookProvider) => {
        setSelectedWebhookProvider(provider);
        setWebhookUrl(webhookProviderById[provider].defaultUrl);
    };

    const handleToggleWebhookEnabled = async (webhook: WebhookDestination) => {
        setLoadingWebhookId(webhook._id);
        try {
            await updateWebhook({ webhookId: webhook._id, isEnabled: !webhook.isEnabled });
            toast.success(webhook.isEnabled ? "Webhook destination disabled" : "Webhook destination enabled");
        } catch { toast.error("Failed to update webhook destination"); }
        finally { setLoadingWebhookId(null); }
    };

    const handleRotateSigningSecret = async (webhook: WebhookDestination) => {
        setLoadingWebhookId(webhook._id);
        try {
            const result = await rotateSigningSecret({ webhookId: webhook._id });
            setLatestSigningSecret(result.signingSecret);
            toast.success("Signing secret rotated");
        } catch { toast.error("Failed to rotate signing secret"); }
        finally { setLoadingWebhookId(null); }
    };

    const handleDeleteWebhook = async (webhook: WebhookDestination) => {
        setLoadingWebhookId(webhook._id);
        try {
            await removeWebhook({ webhookId: webhook._id });
            toast.success("Webhook destination removed");
        } catch { toast.error("Failed to remove webhook destination"); }
        finally { setLoadingWebhookId(null); }
    };

    const handleClearDeliveryHistory = async () => {
        if (deliveryLogs.length === 0) { toast.info("No delivery history to clear"); return; }
        setIsClearingDeliveryHistory(true);
        try {
            let totalDeleted = 0; let hasMore = true; let safetyCounter = 0;
            while (hasMore && safetyCounter < 20) {
                const result = await clearDeliveryHistory({});
                totalDeleted += result.deletedCount;
                hasMore = result.hasMore && result.deletedCount > 0;
                safetyCounter += 1;
                if (result.deletedCount === 0) break;
            }
            if (totalDeleted > 0) {
                toast.success(`Cleared ${totalDeleted} delivery histor${totalDeleted === 1 ? "y entry" : "y entries"}`);
            } else { toast.info("No delivery history to clear"); }
        } catch { toast.error("Failed to clear delivery history"); }
        finally { setIsClearingDeliveryHistory(false); }
    };

    const resetGenerator = () => {
        setSelectedIntegration("html5");
        setScriptUrl(DEFAULT_WIDGET_SCRIPT_URL);
        setPosition("bottom-right");
    };

    const webhookDestinations = webhookDashboard?.webhooks ?? [];
    const deliveryLogs = webhookDashboard?.deliveries ?? [];
    const hasOverflowingDeliveryHistory = deliveryLogs.length > DELIVERY_HISTORY_VISIBLE_COUNT;
    const successCount = deliveryLogs.filter((d) => d.status === "success").length;
    const failedCount = deliveryLogs.filter((d) => d.status === "failed").length;

    // Last delivery per webhook
    const lastDeliveryByWebhookId = useMemo(() => {
        const map: Record<string, WebhookDelivery> = {};
        for (const d of deliveryLogs) {
            if (!map[d.webhookId]) map[d.webhookId] = d;
        }
        return map;
    }, [deliveryLogs]);

    const NAV_ITEMS: { id: ActiveSection; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: "widget", label: "Widget Setup", icon: <PlugZapIcon className="size-4" /> },
        { id: "webhooks", label: "Event Webhooks", icon: <WebhookIcon className="size-4" />, count: webhookDestinations.length },
    ];

    return (
        <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden bg-muted/40">

            {/* ── Page Header ── */}
            <div className="border-b bg-background">
                <div className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                            <ZapIcon className="size-3.5" />
                            <span>Configuration</span>
                            <ChevronRightIcon className="size-3" />
                            <span className="text-foreground font-medium">Integrations</span>
                        </div>
                        <h1 className="text-xl font-bold tracking-tight sm:text-3xl">Setup & Integrations</h1>
                        <p className="hidden text-muted-foreground mt-1 sm:block">
                            Install the widget on your app and wire up real-time event automations.
                        </p>
                    </div>

                    {/* Org ID strip */}
                    <div className="mt-4 flex items-center gap-2 rounded-xl border bg-muted/60 px-3 py-2.5 sm:mt-6 sm:gap-3 sm:px-4 sm:py-3">
                        <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="hidden text-sm text-muted-foreground shrink-0 sm:inline">Organization ID</span>
                        <code className="flex-1 truncate font-mono text-xs text-foreground sm:text-sm">
                            {organization?.id ?? "—"}
                        </code>
                        <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={handleCopyOrganizationId} type="button">
                            <CopyIcon className="size-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                        </Button>
                    </div>

                    {/* Tab nav */}
                    <div className="-mb-px mt-6 flex gap-1 overflow-x-auto border-b pb-1">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                type="button"
                                className={cn(
                                    "shrink-0 flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                                    activeSection === item.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {item.icon}
                                {item.label}
                                {item.count !== undefined && item.count > 0 && (
                                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary font-semibold">
                                        {item.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

                {/* ─── WIDGET SETUP ─── */}
                {activeSection === "widget" && (
                    <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
                        {/* Left: Framework picker + config */}
                        <div className="min-w-0 space-y-6">
                            <div>
                                <h2 className="text-base font-semibold mb-1">Choose a framework</h2>
                                <p className="text-sm text-muted-foreground">
                                    Pick where you want to install the widget.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {INTEGRATIONS.map((integration) => {
                                    const isSelected = integration.id === selectedIntegration;
                                    const isPopular = integration.id === "react" || integration.id === "nextjs";
                                    return (
                                        <button
                                            key={integration.id}
                                            className={cn(
                                                "group relative w-full min-w-0 rounded-xl border-2 bg-background p-4 text-left",
                                                "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                                                    : "border-border hover:border-muted-foreground/40"
                                            )}
                                            onClick={() => setSelectedIntegration(integration.id)}
                                            type="button"
                                        >
                                            {isSelected && (
                                                <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-primary" />
                                            )}
                                            {isPopular && !isSelected && (
                                                <span className="absolute top-2 right-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary uppercase tracking-wide">
                                                    Popular
                                                </span>
                                            )}
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="size-10 rounded-lg flex items-center justify-center bg-muted transition-transform duration-200 group-hover:scale-105">
                                                    <Image alt={integration.title} height={24} src={integration.icon} width={24} />
                                                </div>
                                                <span className="font-semibold text-sm">{integration.title}</span>
                                            </div>
                                            <p className="text-muted-foreground text-xs leading-relaxed">
                                                {integration.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="rounded-xl border bg-background p-5 space-y-4">
                                <h3 className="text-sm font-semibold">Widget Configuration</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="widget-script-url" className="text-xs text-muted-foreground">Script URL</Label>
                                    <Input
                                        id="widget-script-url"
                                        onChange={(e) => setScriptUrl(e.target.value)}
                                        placeholder="https://your-domain.com/widget.js"
                                        value={scriptUrl}
                                        className={cn("font-mono text-sm", scriptUrlIsValid && "border-green-500/50 focus-visible:ring-green-500/20")}
                                    />
                                    <p className={cn("text-xs", scriptUrlIsValid ? "text-green-600 dark:text-green-400" : "text-muted-foreground")}>
                                        {scriptUrlIsValid ? "Valid URL — will be used in generated snippets." : "Use an absolute http(s) URL for the widget script."}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="launcher-position" className="text-xs text-muted-foreground">Launcher Position</Label>
                                    <Select onValueChange={(v) => setPosition(v as WidgetPosition)} value={position}>
                                        <SelectTrigger className="w-full" id="launcher-position">
                                            <SelectValue placeholder="Select position" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WIDGET_POSITIONS.map((opt) => (
                                                <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <button
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                                    onClick={resetGenerator}
                                    type="button"
                                >
                                    Reset to defaults
                                </button>
                            </div>
                        </div>

                        {/* Right: Generated snippet */}
                        <div className="min-w-0 space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-semibold">Generated snippet</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedIntegrationItem?.title ?? "Framework"} code with your organization settings.
                                    </p>
                                </div>
                                <Button
                                    className={cn("gap-2 transition-all duration-200", snippetCopied && "text-green-600")}
                                    disabled={!snippet || !scriptUrlIsValid}
                                    onClick={handleCopySnippet}
                                    size="sm"
                                    type="button"
                                    variant={snippetCopied ? "outline" : "default"}
                                >
                                    {snippetCopied ? (
                                        <><CheckCircle2Icon className="size-3.5" />Copied!</>
                                    ) : (
                                        <><CopyIcon className="size-3.5" />Copy snippet</>
                                    )}
                                </Button>
                            </div>

                            <div className="min-w-0 overflow-hidden rounded-xl border shadow-sm">
                                {/* Code viewer toolbar */}
                                <div className="flex items-center justify-between bg-zinc-900 px-4 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="size-3 rounded-full bg-red-500/70" />
                                        <span className="size-3 rounded-full bg-yellow-500/70" />
                                        <span className="size-3 rounded-full bg-green-500/70" />
                                    </div>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        {selectedIntegrationItem?.title ?? "snippet"}
                                    </span>
                                    <button
                                        className={cn(
                                            "text-xs transition-colors flex items-center gap-1",
                                            snippetCopied ? "text-green-400" : "text-zinc-400 hover:text-zinc-200"
                                        )}
                                        onClick={handleCopySnippet}
                                        disabled={!snippet || !scriptUrlIsValid}
                                        type="button"
                                    >
                                        {snippetCopied ? (
                                            <><CheckCircle2Icon className="size-3" />copied</>
                                        ) : (
                                            <><CopyIcon className="size-3" />copy</>
                                        )}
                                    </button>
                                </div>
                                {/* Highlighted code block */}
                                <div className="min-h-[320px] min-w-0 w-full overflow-auto bg-zinc-950 p-4 sm:min-h-[380px] sm:p-5">
                                    <pre className="font-mono text-xs leading-relaxed whitespace-pre">
                                        {snippet
                                            ? snippetTokens.map((tok, i) => (
                                                <span key={i} className={tok.cls}>{tok.text}</span>
                                            ))
                                            : <span className="text-zinc-600">// Select an organization to generate your snippet.</span>
                                        }
                                    </pre>
                                </div>
                            </div>

                            <div className="rounded-xl border bg-background p-4">
                                <ol className="space-y-2 text-sm text-muted-foreground list-none">
                                    {[
                                        "Copy the snippet above.",
                                        "Paste it into your app — layout, root component, or HTML page.",
                                        "Publish and test on your live page.",
                                    ].map((step, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                                                {i + 1}
                                            </span>
                                            {step}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── EVENT WEBHOOKS ─── */}
                {activeSection === "webhooks" && (
                    <div className="space-y-8">
                        <div className="grid gap-6 lg:grid-cols-2">

                            {/* ── Left: New Destination form ── */}
                            <div className="rounded-xl border bg-background">
                                <div className="border-b px-5 py-4">
                                    <h2 className="text-sm font-semibold">New Destination</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Connect a platform or custom endpoint to receive live events.
                                    </p>
                                </div>

                                <div className="p-5 space-y-5">
                                    {/* Provider picker */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Destination Type</Label>
                                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                            {WEBHOOK_PROVIDERS.map((provider) => {
                                                const isActive = selectedWebhookProvider === provider.id;
                                                return (
                                                    <button
                                                        key={provider.id}
                                                        type="button"
                                                        onClick={() => handleWebhookProviderChange(provider.id as WebhookProvider)}
                                                        className={cn(
                                                            "flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5",
                                                            "transition-all duration-150 hover:scale-105 active:scale-95",
                                                            isActive
                                                                ? "border-primary bg-primary/5 shadow-md shadow-primary/20 scale-105"
                                                                : "border-border hover:border-muted-foreground/40"
                                                        )}
                                                    >
                                                        <div className="size-9 flex items-center justify-center">
                                                            <ProviderIcon provider={provider.id as WebhookProvider} size={28} />
                                                        </div>
                                                        <span className={cn(
                                                            "text-[10px] font-medium leading-none truncate w-full text-center",
                                                            isActive ? "text-primary" : "text-muted-foreground"
                                                        )}>
                                                            {provider.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {selectedWebhookProviderItem.description}
                                        </p>
                                    </div>

                                    <div className="h-px bg-border" />

                                    {/* URL */}
                                    <div className="space-y-2">
                                        <Label htmlFor="webhook-url" className="text-xs text-muted-foreground">
                                            {selectedWebhookProvider === "telegram" || selectedWebhookProvider === "whatsapp"
                                                ? "Endpoint URL (optional override)"
                                                : "Destination URL"}
                                        </Label>
                                        <Input
                                            id="webhook-url"
                                            onChange={(e) => setWebhookUrl(e.target.value)}
                                            placeholder={selectedWebhookProviderItem.defaultUrl}
                                            value={webhookUrl}
                                            className="font-mono text-sm"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {selectedWebhookProvider === "telegram" || selectedWebhookProvider === "whatsapp"
                                                ? "Leave as default unless using a custom relay endpoint."
                                                : "Use the webhook URL from your destination app."}
                                        </p>
                                    </div>

                                    {/* Telegram fields */}
                                    {selectedWebhookProvider === "telegram" && (
                                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ProviderIcon provider="telegram" size={14} />
                                                <span className="text-xs font-medium text-muted-foreground">Telegram Config</span>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="telegram-bot-token" className="text-xs text-muted-foreground">Bot Token</Label>
                                                <Input id="telegram-bot-token" onChange={(e) => setTelegramBotToken(e.target.value)} placeholder="123456789:AA..." type="password" value={telegramBotToken} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="telegram-chat-id" className="text-xs text-muted-foreground">Chat ID</Label>
                                                <Input id="telegram-chat-id" onChange={(e) => setTelegramChatId(e.target.value)} placeholder="-1001234567890" value={telegramChatId} />
                                            </div>
                                        </div>
                                    )}

                                    {/* WhatsApp fields */}
                                    {selectedWebhookProvider === "whatsapp" && (
                                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ProviderIcon provider="whatsapp" size={14} />
                                                <span className="text-xs font-medium text-muted-foreground">WhatsApp Config</span>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-access-token" className="text-xs text-muted-foreground">Access Token</Label>
                                                <Input id="whatsapp-access-token" onChange={(e) => setWhatsappAccessToken(e.target.value)} placeholder="EAAG..." type="password" value={whatsappAccessToken} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-phone-number-id" className="text-xs text-muted-foreground">Phone Number ID</Label>
                                                <Input id="whatsapp-phone-number-id" onChange={(e) => setWhatsappPhoneNumberId(e.target.value)} placeholder="123456789012345" value={whatsappPhoneNumberId} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-recipient-phone" className="text-xs text-muted-foreground">Recipient Phone</Label>
                                                <Input id="whatsapp-recipient-phone" onChange={(e) => setWhatsappRecipientPhone(e.target.value)} placeholder="15551234567" value={whatsappRecipientPhone} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Label */}
                                    <div className="space-y-2">
                                        <Label htmlFor="webhook-description" className="text-xs text-muted-foreground">
                                            Label <span className="text-muted-foreground/60">(optional)</span>
                                        </Label>
                                        <Input id="webhook-description" onChange={(e) => setWebhookDescription(e.target.value)} placeholder="e.g. Production alerts" value={webhookDescription} />
                                    </div>

                                    {/* Trigger events */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Trigger Events</Label>
                                        <div className="space-y-1.5">
                                            {WEBHOOK_EVENT_TYPES.map((eventType) => {
                                                const checked = selectedWebhookEvents.includes(eventType.id);
                                                return (
                                                    <label
                                                        key={eventType.id}
                                                        className={cn(
                                                            "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                                                            checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/50"
                                                        )}
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={() => handleToggleWebhookEvent(eventType.id)}
                                                            className="mt-0.5"
                                                        />
                                                        <span className="space-y-0.5">
                                                            <span className="block text-sm font-medium">{eventType.label}</span>
                                                            <span className="block text-xs text-muted-foreground">{eventType.description}</span>
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <Button className="w-full gap-2" disabled={isCreatingWebhook} onClick={handleCreateWebhook} type="button">
                                        {isCreatingWebhook
                                            ? <><Loader2Icon className="size-4 animate-spin" />Creating...</>
                                            : <><ZapIcon className="size-4" />Create Webhook Destination</>
                                        }
                                    </Button>
                                </div>

                                {/* Signing secret reveal */}
                                {latestSigningSecret && (
                                    <div className="mx-5 mb-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <KeyRoundIcon className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                                Signing Secret — save this now
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input className="font-mono text-xs bg-background" readOnly value={latestSigningSecret} />
                                            <Button size="sm" variant="outline" className="shrink-0"
                                                onClick={() => copyText(latestSigningSecret, "Signing secret copied", "Failed to copy signing secret")}
                                                type="button"
                                            >
                                                <CopyIcon className="size-3.5" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                                            Shown once only. Use it to verify webhook payload signatures.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* ── Right: Active Destinations ── */}
                            <div className="rounded-xl border bg-background">
                                <div className="flex items-center justify-between border-b px-5 py-4">
                                    <div>
                                        <h2 className="text-sm font-semibold">Active Destinations</h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">Manage and toggle your connected endpoints.</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {webhookDestinations.length} connected
                                    </Badge>
                                </div>

                                <div className="p-5">
                                    {webhookDestinations.length === 0 ? (
                                        <EmptyWebhooksState />
                                    ) : (
                                        <div className="space-y-2">
                                            {webhookDestinations.map((webhook) => {
                                                const isExpanded = expandedWebhookId === webhook._id;
                                                const lastDelivery = lastDeliveryByWebhookId[webhook._id];
                                                return (
                                                    <div
                                                        key={webhook._id}
                                                        className={cn(
                                                            "rounded-lg border overflow-hidden transition-all duration-200",
                                                            !webhook.isEnabled && "opacity-60"
                                                        )}
                                                    >
                                                        {/* Collapsed header — always visible */}
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-expanded={isExpanded}
                                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                                                            onClick={() => setExpandedWebhookId(isExpanded ? null : webhook._id)}
                                                            onKeyDown={(event) => {
                                                                if (event.key === "Enter" || event.key === " ") {
                                                                    event.preventDefault()
                                                                    setExpandedWebhookId(isExpanded ? null : webhook._id)
                                                                }
                                                            }}
                                                        >
                                                            <div className="size-8 shrink-0 flex items-center justify-center rounded-md border bg-muted">
                                                                <ProviderIcon provider={webhook.provider} size={18} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold">{formatWebhookProviderLabel(webhook.provider)}</span>
                                                                    {webhook.isEnabled ? (
                                                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                                                            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                                                                            Live
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">Paused</span>
                                                                    )}
                                                                </div>
                                                                {webhook.description && (
                                                                    <p className="text-xs text-muted-foreground truncate">{webhook.description}</p>
                                                                )}
                                                                {lastDelivery && (
                                                                    <p className={cn("text-[10px] mt-0.5", lastDelivery.status === "success" ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                                                                        Last: {lastDelivery.status} {formatTimeAgo(lastDelivery._creationTime)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Switch
                                                                    checked={webhook.isEnabled}
                                                                    disabled={loadingWebhookId === webhook._id}
                                                                    onCheckedChange={() => handleToggleWebhookEnabled(webhook)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <ChevronDownIcon
                                                                    className={cn(
                                                                        "size-4 text-muted-foreground transition-transform duration-200",
                                                                        isExpanded && "rotate-180"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Expanded details */}
                                                        <div
                                                            className={cn(
                                                                "overflow-hidden transition-all duration-200 border-t",
                                                                isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0 border-t-0"
                                                            )}
                                                        >
                                                            <div className="px-4 py-3 space-y-3 bg-muted/10">
                                                                {/* URL */}
                                                                {webhook.url && (
                                                                    <p className="text-xs text-muted-foreground font-mono break-all">{webhook.url}</p>
                                                                )}
                                                                {webhook.provider === "telegram" && (
                                                                    <p className="text-xs text-muted-foreground">Chat ID: {webhook.providerConfigPreview?.telegramChatId || "—"}</p>
                                                                )}
                                                                {webhook.provider === "whatsapp" && (
                                                                    <p className="text-xs text-muted-foreground">Recipient: {webhook.providerConfigPreview?.whatsappRecipientPhone || "—"}</p>
                                                                )}
                                                                <p className="text-[10px] text-muted-foreground/50 font-mono">sig: {webhook.signingSecretPreview}</p>

                                                                {/* Event badges */}
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {webhook.eventTypes.map((et) => (
                                                                        <Badge key={`${webhook._id}-${et}`} variant="secondary" className="text-xs px-2 py-0.5">
                                                                            {formatEventTypeLabel(et)}
                                                                        </Badge>
                                                                    ))}
                                                                </div>

                                                                {/* Action buttons */}
                                                                <div className="flex items-center gap-2 pt-1">
                                                                    <Button
                                                                        className="gap-1.5 h-8 text-xs"
                                                                        disabled={loadingWebhookId === webhook._id}
                                                                        onClick={() => handleRotateSigningSecret(webhook)}
                                                                        size="sm" type="button" variant="outline"
                                                                    >
                                                                        <RefreshCwIcon className="size-3" />
                                                                        Rotate Secret
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                className="gap-1.5 h-8 text-xs"
                                                                                disabled={loadingWebhookId === webhook._id}
                                                                                size="sm" type="button" variant="destructive"
                                                                            >
                                                                                <Trash2Icon className="size-3" />
                                                                                Remove
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Remove webhook destination?</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    This will permanently delete the {formatWebhookProviderLabel(webhook.provider)} destination
                                                                                    {webhook.description ? ` "${webhook.description}"` : ""} and all its delivery history. This action cannot be undone.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={() => handleDeleteWebhook(webhook)}>
                                                                                    Remove
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Delivery History ── */}
                        <div className="rounded-xl border bg-background">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
                                <div className="flex items-start gap-3">
                                    <ActivityIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold">Delivery History</h2>
                                            {successCount > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                                    <CheckCircle2Icon className="size-3" />
                                                    {successCount} ok
                                                </span>
                                            )}
                                            {failedCount > 0 && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                                                    <XCircleIcon className="size-3" />
                                                    {failedCount} failed
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                                            Recent webhook dispatch attempts and their outcomes.
                                        </p>
                                    </div>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            className="gap-1.5 h-8 text-xs shrink-0"
                                            disabled={isClearingDeliveryHistory || deliveryLogs.length === 0}
                                            size="sm" type="button" variant="outline"
                                        >
                                            <Trash2Icon className="size-3" />
                                            {isClearingDeliveryHistory ? "Clearing..." : "Clear history"}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Clear delivery history?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete all {deliveryLogs.length} delivery log{deliveryLogs.length !== 1 ? "s" : ""}. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleClearDeliveryHistory}>
                                                Clear history
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>

                            {/* Timeline feed */}
                            {deliveryLogs.length === 0 ? (
                                <EmptyDeliveriesState />
                            ) : (
                                <ScrollArea className={cn(hasOverflowingDeliveryHistory && "h-[35rem]")}>
                                    <div className="divide-y">
                                        {deliveryLogs.map((delivery) => (
                                            <div
                                                key={delivery._id}
                                                className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/20 transition-colors"
                                            >
                                                <div
                                                    className={cn(
                                                        "mt-1.5 size-2 shrink-0 rounded-full",
                                                        delivery.status === "success" ? "bg-green-500" : "bg-red-500"
                                                    )}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-medium">{formatEventTypeLabel(delivery.eventType)}</span>
                                                        <span className="text-xs text-muted-foreground shrink-0">{formatTimeAgo(delivery._creationTime)}</span>
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                                        <span
                                                            className={cn(
                                                                "font-medium",
                                                                delivery.status === "success" ? "text-green-600 dark:text-green-400" : "text-red-500"
                                                            )}
                                                        >
                                                            {delivery.status}
                                                        </span>
                                                        <span className="font-mono truncate max-w-[240px] opacity-70">{delivery.webhookUrl}</span>
                                                        {delivery.responseStatus && <span>· HTTP {delivery.responseStatus}</span>}
                                                        {delivery.durationMs && <span>· {delivery.durationMs}ms</span>}
                                                        {delivery.attempt > 1 && <span>· Attempt #{delivery.attempt}</span>}
                                                        {delivery.error && <span className="text-red-500 truncate max-w-[200px]">· {delivery.error}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
