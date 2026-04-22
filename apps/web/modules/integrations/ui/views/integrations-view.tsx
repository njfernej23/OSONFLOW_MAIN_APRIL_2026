"use client";

import { useOrganization } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@workspace/ui/components/table";
import {
    ActivityIcon,
    CheckCircle2Icon,
    ChevronRightIcon,
    CopyIcon,
    KeyRoundIcon,
    PlugZapIcon,
    RefreshCwIcon,
    Trash2Icon,
    WebhookIcon,
    XCircleIcon,
    ZapIcon,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
    (accumulator, eventType) => {
        accumulator[eventType.id] = eventType;
        return accumulator;
    },
    {} as Record<WebhookEventType, (typeof WEBHOOK_EVENT_TYPES)[number]>
);

const webhookProviderById = WEBHOOK_PROVIDERS.reduce(
    (accumulator, provider) => {
        accumulator[provider.id] = provider;
        return accumulator;
    },
    {} as Record<WebhookProvider, (typeof WEBHOOK_PROVIDERS)[number]>
);

const formatEventTypeLabel = (eventType: WebhookEventType) => {
    return webhookEventTypeById[eventType]?.label ?? eventType;
};

const formatWebhookProviderLabel = (provider: WebhookProvider) => {
    return webhookProviderById[provider]?.label ?? provider;
};

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
};

/** Maps each provider to its public image path. "webhook" has no image so we render an icon instead. */
const PROVIDER_IMAGE_SRC: Partial<Record<WebhookProvider, string>> = {
    discord: "/discord.png",
    slack: "/slack.png",
    telegram: "/telegram.png",
    whatsapp: "/whatsapp.png",
};

/** Renders the provider logo or a fallback icon for Custom Webhook. */
const ProviderIcon = ({
    provider,
    size = 24,
}: {
    provider: WebhookProvider;
    size?: number;
}) => {
    const src = PROVIDER_IMAGE_SRC[provider];
    if (src) {
        return (
            <Image
                alt={formatWebhookProviderLabel(provider)}
                src={src}
                width={size}
                height={size}
                className="rounded-sm object-contain"
            />
        );
    }
    return <WebhookIcon style={{ width: size, height: size }} className="text-muted-foreground" />;
};

type ActiveSection = "widget" | "webhooks";

export const IntegrationsView = () => {
    const { organization } = useOrganization();

    const [activeSection, setActiveSection] = useState<ActiveSection>("widget");

    const [selectedIntegration, setSelectedIntegration] =
        useState<IntegrationId>("html5");
    const [scriptUrl, setScriptUrl] = useState(DEFAULT_WIDGET_SCRIPT_URL);
    const [position, setPosition] = useState<WidgetPosition>("bottom-right");

    const [selectedWebhookProvider, setSelectedWebhookProvider] =
        useState<WebhookProvider>("discord");
    const [webhookUrl, setWebhookUrl] = useState<string>(webhookProviderById.discord.defaultUrl);
    const [webhookDescription, setWebhookDescription] = useState("");
    const [telegramBotToken, setTelegramBotToken] = useState("");
    const [telegramChatId, setTelegramChatId] = useState("");
    const [whatsappAccessToken, setWhatsappAccessToken] = useState("");
    const [whatsappPhoneNumberId, setWhatsappPhoneNumberId] = useState("");
    const [whatsappRecipientPhone, setWhatsappRecipientPhone] = useState("");
    const [selectedWebhookEvents, setSelectedWebhookEvents] = useState<WebhookEventType[]>(
        WEBHOOK_EVENT_TYPES.map((eventType) => eventType.id)
    );
    const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
    const [isClearingDeliveryHistory, setIsClearingDeliveryHistory] = useState(false);
    const [loadingWebhookId, setLoadingWebhookId] = useState<string | null>(null);
    const [latestSigningSecret, setLatestSigningSecret] = useState<string | null>(null);

    const normalizedScriptUrl = useMemo(() => normalizeScriptUrl(scriptUrl), [scriptUrl]);
    const scriptUrlIsValid = useMemo(
        () => isValidWidgetScriptUrl(normalizedScriptUrl),
        [normalizedScriptUrl],
    );

    const selectedIntegrationItem = useMemo(
        () => INTEGRATIONS.find((integration) => integration.id === selectedIntegration),
        [selectedIntegration],
    );

    const selectedWebhookProviderItem = useMemo(
        () => webhookProviderById[selectedWebhookProvider],
        [selectedWebhookProvider],
    );

    const snippet = useMemo(() => {
        if (!organization?.id) return "";
        return createScript(selectedIntegration, {
            organizationId: organization.id,
            scriptUrl: normalizedScriptUrl,
            position,
        });
    }, [organization?.id, selectedIntegration, normalizedScriptUrl, position]);

    const webhookDashboard = useQuery(
        (api as any).private.integrationWebhooks.getDashboard,
        {},
    ) as WebhookDashboard | undefined;

    const createWebhook = useMutation(
        (api as any).private.integrationWebhooks.createWebhook,
    ) as (args: {
        url?: string;
        description?: string;
        provider: WebhookProvider;
        providerConfig?: {
            telegramBotToken?: string;
            telegramChatId?: string;
            whatsappAccessToken?: string;
            whatsappPhoneNumberId?: string;
            whatsappRecipientPhone?: string;
        };
        eventTypes: WebhookEventType[];
    }) => Promise<{ webhookId: string; signingSecret: string }>;

    const updateWebhook = useMutation(
        (api as any).private.integrationWebhooks.updateWebhook,
    ) as (args: {
        webhookId: string;
        isEnabled?: boolean;
        url?: string;
        description?: string;
        eventTypes?: WebhookEventType[];
        provider?: WebhookProvider;
        providerConfig?: {
            telegramBotToken?: string;
            telegramChatId?: string;
            whatsappAccessToken?: string;
            whatsappPhoneNumberId?: string;
            whatsappRecipientPhone?: string;
        };
    }) => Promise<void>;

    const rotateSigningSecret = useMutation(
        (api as any).private.integrationWebhooks.rotateSigningSecret,
    ) as (args: { webhookId: string }) => Promise<{ signingSecret: string }>;

    const removeWebhook = useMutation(
        (api as any).private.integrationWebhooks.removeWebhook,
    ) as (args: { webhookId: string }) => Promise<void>;

    const clearDeliveryHistory = useMutation(
        (api as any).private.integrationWebhooks.clearDeliveryHistory,
    ) as (args: { webhookId?: string }) => Promise<{ deletedCount: number; hasMore: boolean }>;

    const copyText = async (value: string, successMessage: string, errorMessage: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(successMessage);
        } catch {
            toast.error(errorMessage);
        }
    };

    const handleCopyOrganizationId = async () => {
        if (!organization?.id) { toast.error("Organization ID not found"); return; }
        await copyText(organization.id, "Organization ID copied", "Failed to copy organization ID");
    };

    const handleCopySnippet = async () => {
        if (!snippet) { toast.error("Generate a snippet first"); return; }
        await copyText(snippet, "Snippet copied to clipboard", "Failed to copy snippet");
    };

    const handleCreateWebhook = async () => {
        const normalizedUrl = webhookUrl.trim();
        const isUrlRequired =
            selectedWebhookProvider === "webhook" ||
            selectedWebhookProvider === "discord" ||
            selectedWebhookProvider === "slack";

        if (isUrlRequired && !normalizedUrl) { toast.error("Destination URL is required"); return; }

        if (selectedWebhookProvider === "telegram") {
            if (!telegramBotToken.trim() || !telegramChatId.trim()) {
                toast.error("Telegram requires bot token and chat ID"); return;
            }
        }

        if (selectedWebhookProvider === "whatsapp") {
            if (!whatsappAccessToken.trim() || !whatsappPhoneNumberId.trim() || !whatsappRecipientPhone.trim()) {
                toast.error("WhatsApp requires access token, phone number ID, and recipient"); return;
            }
        }

        if (selectedWebhookEvents.length === 0) { toast.error("Select at least one event type"); return; }

        setIsCreatingWebhook(true);
        try {
            const providerConfig =
                selectedWebhookProvider === "telegram"
                    ? { telegramBotToken: telegramBotToken.trim(), telegramChatId: telegramChatId.trim() }
                    : selectedWebhookProvider === "whatsapp"
                      ? {
                            whatsappAccessToken: whatsappAccessToken.trim(),
                            whatsappPhoneNumberId: whatsappPhoneNumberId.trim(),
                            whatsappRecipientPhone: whatsappRecipientPhone.trim(),
                        }
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
            setTelegramBotToken("");
            setTelegramChatId("");
            setWhatsappAccessToken("");
            setWhatsappPhoneNumberId("");
            setWhatsappRecipientPhone("");
            toast.success("Webhook destination created");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create webhook destination");
        } finally {
            setIsCreatingWebhook(false);
        }
    };

    const handleToggleWebhookEvent = (eventType: WebhookEventType) => {
        setSelectedWebhookEvents((previous) =>
            previous.includes(eventType)
                ? previous.filter((v) => v !== eventType)
                : [...previous, eventType]
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
        } catch (error) {
            console.error(error);
            toast.error("Failed to update webhook destination");
        } finally {
            setLoadingWebhookId(null);
        }
    };

    const handleRotateSigningSecret = async (webhook: WebhookDestination) => {
        setLoadingWebhookId(webhook._id);
        try {
            const result = await rotateSigningSecret({ webhookId: webhook._id });
            setLatestSigningSecret(result.signingSecret);
            toast.success("Signing secret rotated");
        } catch (error) {
            console.error(error);
            toast.error("Failed to rotate signing secret");
        } finally {
            setLoadingWebhookId(null);
        }
    };

    const handleDeleteWebhook = async (webhook: WebhookDestination) => {
        setLoadingWebhookId(webhook._id);
        try {
            await removeWebhook({ webhookId: webhook._id });
            toast.success("Webhook destination removed");
        } catch (error) {
            console.error(error);
            toast.error("Failed to remove webhook destination");
        } finally {
            setLoadingWebhookId(null);
        }
    };

    const handleClearDeliveryHistory = async () => {
        if (deliveryLogs.length === 0) { toast.info("No delivery history to clear"); return; }

        const shouldProceed = window.confirm("Clear delivery history? This action cannot be undone.");
        if (!shouldProceed) return;

        setIsClearingDeliveryHistory(true);
        try {
            let totalDeleted = 0;
            let hasMore = true;
            let safetyCounter = 0;

            while (hasMore && safetyCounter < 20) {
                const result = await clearDeliveryHistory({});
                totalDeleted += result.deletedCount;
                hasMore = result.hasMore && result.deletedCount > 0;
                safetyCounter += 1;
                if (result.deletedCount === 0) break;
            }

            if (totalDeleted > 0) {
                toast.success(`Cleared ${totalDeleted} delivery histor${totalDeleted === 1 ? "y entry" : "y entries"}`);
            } else {
                toast.info("No delivery history to clear");
            }

            if (hasMore) toast.info("More history remains. Click Clear history again to continue.");
        } catch (error) {
            console.error(error);
            toast.error("Failed to clear delivery history");
        } finally {
            setIsClearingDeliveryHistory(false);
        }
    };

    const resetGenerator = () => {
        setSelectedIntegration("html5");
        setScriptUrl(DEFAULT_WIDGET_SCRIPT_URL);
        setPosition("bottom-right");
    };

    const webhookDestinations = webhookDashboard?.webhooks ?? [];
    const deliveryLogs = webhookDashboard?.deliveries ?? [];
    const successCount = deliveryLogs.filter((d) => d.status === "success").length;
    const failedCount = deliveryLogs.filter((d) => d.status === "failed").length;

    const NAV_ITEMS: { id: ActiveSection; label: string; icon: React.ReactNode; count?: number }[] = [
        { id: "widget", label: "Widget Setup", icon: <PlugZapIcon className="size-4" /> },
        { id: "webhooks", label: "Event Webhooks", icon: <WebhookIcon className="size-4" />, count: webhookDestinations.length },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-muted/40">

            {/* ── Page Header ── */}
            <div className="border-b bg-background">
                <div className="mx-auto w-full max-w-screen-xl px-8 py-8">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                            <ZapIcon className="size-3.5" />
                            <span>Configuration</span>
                            <ChevronRightIcon className="size-3" />
                            <span className="text-foreground font-medium">Integrations</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Setup & Integrations</h1>
                        <p className="text-muted-foreground mt-1">
                            Install the widget on your app and wire up real-time event automations.
                        </p>
                    </div>

                    {/* Org ID strip */}
                    <div className="mt-6 flex items-center gap-3 rounded-xl border bg-muted/60 px-4 py-3">
                        <KeyRoundIcon className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-muted-foreground shrink-0">Organization ID</span>
                        <code className="flex-1 truncate font-mono text-sm text-foreground">
                            {organization?.id ?? "—"}
                        </code>
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 shrink-0"
                            onClick={handleCopyOrganizationId}
                            type="button"
                        >
                            <CopyIcon className="size-3.5" />
                            Copy
                        </Button>
                    </div>

                    {/* Tab nav */}
                    <div className="mt-6 flex gap-1 border-b -mb-px">
                        {NAV_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                type="button"
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                    activeSection === item.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
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
            <div className="mx-auto w-full max-w-screen-xl px-8 py-8">

                {/* ─── WIDGET SETUP ─── */}
                {activeSection === "widget" && (
                    <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
                        {/* Left: Framework picker + config */}
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-base font-semibold mb-1">Choose a framework</h2>
                                <p className="text-sm text-muted-foreground">
                                    Pick where you want to install the widget.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {INTEGRATIONS.map((integration) => {
                                    const isSelected = integration.id === selectedIntegration;
                                    return (
                                        <button
                                            key={integration.id}
                                            className={`group relative rounded-xl border-2 bg-background p-4 text-left transition-all duration-150 hover:shadow-sm ${
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-muted-foreground/40"
                                            }`}
                                            onClick={() => setSelectedIntegration(integration.id)}
                                            type="button"
                                        >
                                            {isSelected && (
                                                <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-primary" />
                                            )}
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="size-8 rounded-lg flex items-center justify-center bg-muted">
                                                    <Image
                                                        alt={integration.title}
                                                        height={20}
                                                        src={integration.icon}
                                                        width={20}
                                                    />
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
                                    <Label htmlFor="widget-script-url" className="text-xs text-muted-foreground">
                                        Script URL
                                    </Label>
                                    <Input
                                        id="widget-script-url"
                                        onChange={(event) => setScriptUrl(event.target.value)}
                                        placeholder="https://your-domain.com/widget.js"
                                        value={scriptUrl}
                                        className={`font-mono text-sm ${scriptUrlIsValid ? "border-green-500/50 focus-visible:ring-green-500/20" : ""}`}
                                    />
                                    <p className={`text-xs ${scriptUrlIsValid ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                                        {scriptUrlIsValid
                                            ? "Valid URL — will be used in generated snippets."
                                            : "Use an absolute http(s) URL for the widget script."}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="launcher-position" className="text-xs text-muted-foreground">
                                        Launcher Position
                                    </Label>
                                    <Select
                                        onValueChange={(value) => setPosition(value as WidgetPosition)}
                                        value={position}
                                    >
                                        <SelectTrigger className="w-full" id="launcher-position">
                                            <SelectValue placeholder="Select position" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {WIDGET_POSITIONS.map((option) => (
                                                <SelectItem key={option.id} value={option.id}>
                                                    {option.label}
                                                </SelectItem>
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
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-base font-semibold">Generated snippet</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedIntegrationItem?.title ?? "Framework"} code with your organization settings.
                                    </p>
                                </div>
                                <Button
                                    className="gap-2"
                                    disabled={!snippet || !scriptUrlIsValid}
                                    onClick={handleCopySnippet}
                                    size="sm"
                                    type="button"
                                >
                                    <CopyIcon className="size-3.5" />
                                    Copy snippet
                                </Button>
                            </div>

                            <div className="rounded-xl border overflow-hidden shadow-sm">
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
                                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                                        onClick={handleCopySnippet}
                                        disabled={!snippet || !scriptUrlIsValid}
                                        type="button"
                                    >
                                        <CopyIcon className="size-3" />
                                        copy
                                    </button>
                                </div>
                                <textarea
                                    className="w-full min-h-[380px] resize-none bg-zinc-950 p-5 font-mono text-xs text-zinc-300 leading-relaxed focus:outline-none"
                                    readOnly
                                    value={snippet || "// Select an organization to generate your snippet."}
                                />
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

                        {/* Top two-column: form + destinations */}
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
                                        <Label className="text-xs text-muted-foreground">
                                            Destination Type
                                        </Label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {WEBHOOK_PROVIDERS.map((provider) => {
                                                const isActive = selectedWebhookProvider === provider.id;
                                                return (
                                                    <button
                                                        key={provider.id}
                                                        type="button"
                                                        onClick={() => handleWebhookProviderChange(provider.id as WebhookProvider)}
                                                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all ${
                                                            isActive
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:border-muted-foreground/40"
                                                        }`}
                                                    >
                                                        <div className="size-7 flex items-center justify-center">
                                                            <ProviderIcon provider={provider.id as WebhookProvider} size={22} />
                                                        </div>
                                                        <span className={`text-[10px] font-medium leading-none truncate w-full text-center ${isActive ? "text-primary" : "text-muted-foreground"}`}>
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

                                    {/* Destination URL */}
                                    <div className="space-y-2">
                                        <Label htmlFor="webhook-url" className="text-xs text-muted-foreground">
                                            {selectedWebhookProvider === "telegram" || selectedWebhookProvider === "whatsapp"
                                                ? "Endpoint URL (optional override)"
                                                : "Destination URL"}
                                        </Label>
                                        <Input
                                            id="webhook-url"
                                            onChange={(event) => setWebhookUrl(event.target.value)}
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

                                    {/* Telegram extra fields */}
                                    {selectedWebhookProvider === "telegram" && (
                                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ProviderIcon provider="telegram" size={14} />
                                                <span className="text-xs font-medium text-muted-foreground">Telegram Config</span>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="telegram-bot-token" className="text-xs text-muted-foreground">
                                                    Bot Token
                                                </Label>
                                                <Input
                                                    id="telegram-bot-token"
                                                    onChange={(event) => setTelegramBotToken(event.target.value)}
                                                    placeholder="123456789:AA..."
                                                    type="password"
                                                    value={telegramBotToken}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="telegram-chat-id" className="text-xs text-muted-foreground">
                                                    Chat ID
                                                </Label>
                                                <Input
                                                    id="telegram-chat-id"
                                                    onChange={(event) => setTelegramChatId(event.target.value)}
                                                    placeholder="-1001234567890"
                                                    value={telegramChatId}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* WhatsApp extra fields */}
                                    {selectedWebhookProvider === "whatsapp" && (
                                        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ProviderIcon provider="whatsapp" size={14} />
                                                <span className="text-xs font-medium text-muted-foreground">WhatsApp Config</span>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-access-token" className="text-xs text-muted-foreground">
                                                    Access Token
                                                </Label>
                                                <Input
                                                    id="whatsapp-access-token"
                                                    onChange={(event) => setWhatsappAccessToken(event.target.value)}
                                                    placeholder="EAAG..."
                                                    type="password"
                                                    value={whatsappAccessToken}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-phone-number-id" className="text-xs text-muted-foreground">
                                                    Phone Number ID
                                                </Label>
                                                <Input
                                                    id="whatsapp-phone-number-id"
                                                    onChange={(event) => setWhatsappPhoneNumberId(event.target.value)}
                                                    placeholder="123456789012345"
                                                    value={whatsappPhoneNumberId}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="whatsapp-recipient-phone" className="text-xs text-muted-foreground">
                                                    Recipient Phone
                                                </Label>
                                                <Input
                                                    id="whatsapp-recipient-phone"
                                                    onChange={(event) => setWhatsappRecipientPhone(event.target.value)}
                                                    placeholder="15551234567"
                                                    value={whatsappRecipientPhone}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Label */}
                                    <div className="space-y-2">
                                        <Label htmlFor="webhook-description" className="text-xs text-muted-foreground">
                                            Label{" "}
                                            <span className="text-muted-foreground/60">(optional)</span>
                                        </Label>
                                        <Input
                                            id="webhook-description"
                                            onChange={(event) => setWebhookDescription(event.target.value)}
                                            placeholder="e.g. Production alerts"
                                            value={webhookDescription}
                                        />
                                    </div>

                                    {/* Trigger events */}
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">
                                            Trigger Events
                                        </Label>
                                        <div className="space-y-1.5">
                                            {WEBHOOK_EVENT_TYPES.map((eventType) => {
                                                const checked = selectedWebhookEvents.includes(eventType.id);
                                                return (
                                                    <label
                                                        key={eventType.id}
                                                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                                            checked
                                                                ? "border-primary/40 bg-primary/5"
                                                                : "border-border hover:bg-muted/50"
                                                        }`}
                                                    >
                                                        <input
                                                            checked={checked}
                                                            className="mt-1 accent-primary"
                                                            onChange={() => handleToggleWebhookEvent(eventType.id)}
                                                            type="checkbox"
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

                                    <Button
                                        className="w-full gap-2"
                                        disabled={isCreatingWebhook}
                                        onClick={handleCreateWebhook}
                                        type="button"
                                    >
                                        <ZapIcon className="size-4" />
                                        {isCreatingWebhook ? "Creating..." : "Create Webhook Destination"}
                                    </Button>
                                </div>

                                {/* Signing secret — below the form card, same width */}
                                {latestSigningSecret && (
                                    <div className="mx-5 mb-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <KeyRoundIcon className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                                Signing Secret — save this now
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                className="font-mono text-xs bg-background"
                                                readOnly
                                                value={latestSigningSecret}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="shrink-0"
                                                onClick={() =>
                                                    copyText(latestSigningSecret, "Signing secret copied", "Failed to copy signing secret")
                                                }
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
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Manage and toggle your connected endpoints.
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs shrink-0">
                                        {webhookDestinations.length} connected
                                    </Badge>
                                </div>

                                <div className="p-5">
                                    {webhookDestinations.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-14 text-center">
                                            <WebhookIcon className="size-8 text-muted-foreground/30 mb-3" />
                                            <p className="text-sm font-medium text-muted-foreground">No destinations yet</p>
                                            <p className="text-xs text-muted-foreground/60 mt-1">
                                                Create your first webhook on the left.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {webhookDestinations.map((webhook) => (
                                                <div
                                                    key={webhook._id}
                                                    className={`rounded-lg border p-4 space-y-3 transition-opacity ${
                                                        !webhook.isEnabled ? "opacity-55" : ""
                                                    }`}
                                                >
                                                    {/* Header row */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <div className="size-8 shrink-0 flex items-center justify-center rounded-md border bg-muted mt-0.5">
                                                                <ProviderIcon provider={webhook.provider} size={18} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm font-semibold">
                                                                        {formatWebhookProviderLabel(webhook.provider)}
                                                                    </span>
                                                                    {webhook.isEnabled ? (
                                                                        <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                                                                            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                                                                            Live
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-muted-foreground">Paused</span>
                                                                    )}
                                                                </div>
                                                                {webhook.url && (
                                                                    <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                                                                        {webhook.url}
                                                                    </p>
                                                                )}
                                                                {webhook.description && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {webhook.description}
                                                                    </p>
                                                                )}
                                                                {webhook.provider === "telegram" && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        Chat ID: {webhook.providerConfigPreview?.telegramChatId || "—"}
                                                                    </p>
                                                                )}
                                                                {webhook.provider === "whatsapp" && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        Recipient: {webhook.providerConfigPreview?.whatsappRecipientPhone || "—"}
                                                                    </p>
                                                                )}
                                                                <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">
                                                                    sig: {webhook.signingSecretPreview}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Switch
                                                            checked={webhook.isEnabled}
                                                            disabled={loadingWebhookId === webhook._id}
                                                            onCheckedChange={() => handleToggleWebhookEnabled(webhook)}
                                                            className="shrink-0 mt-0.5"
                                                        />
                                                    </div>

                                                    {/* Event badges */}
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {webhook.eventTypes.map((eventType) => (
                                                            <Badge
                                                                key={`${webhook._id}-${eventType}`}
                                                                variant="secondary"
                                                                className="text-xs px-2 py-0.5"
                                                            >
                                                                {formatEventTypeLabel(eventType)}
                                                            </Badge>
                                                        ))}
                                                    </div>

                                                    {/* Action buttons */}
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <Button
                                                            className="gap-1.5 h-8 text-xs"
                                                            disabled={loadingWebhookId === webhook._id}
                                                            onClick={() => handleRotateSigningSecret(webhook)}
                                                            size="sm"
                                                            type="button"
                                                            variant="outline"
                                                        >
                                                            <RefreshCwIcon className="size-3" />
                                                            Rotate Secret
                                                        </Button>
                                                        <Button
                                                            className="gap-1.5 h-8 text-xs"
                                                            disabled={loadingWebhookId === webhook._id}
                                                            onClick={() => handleDeleteWebhook(webhook)}
                                                            size="sm"
                                                            type="button"
                                                            variant="destructive"
                                                        >
                                                            <Trash2Icon className="size-3" />
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Delivery History ── */}
                        <div className="rounded-xl border bg-background">
                            <div className="flex items-center justify-between border-b px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <ActivityIcon className="size-4 text-muted-foreground" />
                                    <div>
                                        <h2 className="text-sm font-semibold">Delivery History</h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Recent webhook dispatch attempts and their outcomes.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-2">
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
                                </div>
                                <Button
                                    className="gap-1.5 h-8 text-xs shrink-0"
                                    disabled={isClearingDeliveryHistory || deliveryLogs.length === 0}
                                    onClick={handleClearDeliveryHistory}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                >
                                    <Trash2Icon className="size-3" />
                                    {isClearingDeliveryHistory ? "Clearing..." : "Clear history"}
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                                        <TableHead className="text-xs">Time</TableHead>
                                        <TableHead className="text-xs">Event</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs">Attempt</TableHead>
                                        <TableHead className="text-xs">Destination</TableHead>
                                        <TableHead className="text-xs">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveryLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell className="h-28 text-center text-muted-foreground text-sm" colSpan={6}>
                                                No webhook deliveries yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        deliveryLogs.map((delivery) => (
                                            <TableRow key={delivery._id} className="hover:bg-muted/20">
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDate(delivery._creationTime)}
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    {formatEventTypeLabel(delivery.eventType)}
                                                </TableCell>
                                                <TableCell>
                                                    {delivery.status === "success" ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
                                                            <CheckCircle2Icon className="size-3" />
                                                            success
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                                                            <XCircleIcon className="size-3" />
                                                            failed
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    #{delivery.attempt}
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate text-xs font-mono text-muted-foreground">
                                                    {delivery.webhookUrl}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {delivery.responseStatus
                                                        ? `HTTP ${delivery.responseStatus}`
                                                        : delivery.error || delivery.responseBody || "—"}
                                                    {delivery.durationMs ? (
                                                        <span className="ml-1 text-muted-foreground/50">
                                                            {delivery.durationMs}ms
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
