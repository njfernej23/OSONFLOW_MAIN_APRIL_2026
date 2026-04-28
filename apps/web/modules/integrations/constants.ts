export const DEFAULT_WIDGET_SCRIPT_URL =
    process.env.NEXT_PUBLIC_WIDGET_SCRIPT_URL ?? "https://osonflow-main-april-2026-widget.vercel.app/widget.js";

export const INTEGRATIONS = [
    {
        id: "html5",
        title: "HTML5",
        icon: "/languages/html5.svg",
        description: "Add a single script tag in plain HTML.",
    },
    {
        id: "react",
        title: "React",
        icon: "/languages/react.svg",
        description: "Mount the widget in a reusable React component.",
    },
    {
        id: "nextjs",
        title: "Next.js",
        icon: "/languages/nextjs.svg",
        description: "Use next/script for client-side loading.",
    },
    {
        id: "javascript",
        title: "Javascript",
        icon: "/languages/javascript.svg",
        description: "Load the widget programmatically with vanilla JS.",
    },
] as const;

export type IntegrationId = (typeof INTEGRATIONS)[number]["id"];

export const WIDGET_POSITIONS = [
    {
        id: "bottom-right",
        label: "Bottom right",
    },
    {
        id: "bottom-left",
        label: "Bottom left",
    },
] as const;

export type WidgetPosition = (typeof WIDGET_POSITIONS)[number]["id"];

export const WEBHOOK_EVENT_TYPES = [
    {
        id: "contact_session.created",
        label: "Contact Session Created",
        description: "Triggered when a visitor starts a new contact session.",
    },
    {
        id: "conversation.created",
        label: "Conversation Created",
        description: "Triggered when a new conversation is opened.",
    },
    {
        id: "conversation.status_changed",
        label: "Conversation Status Changed",
        description:
            "Triggered when a conversation moves between unresolved, escalated, or resolved.",
    },
    {
        id: "message.received",
        label: "Message Received",
        description: "Triggered when a visitor sends a message.",
    },
    {
        id: "message.sent",
        label: "Message Sent",
        description: "Triggered when an operator sends a message.",
    },
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number]["id"];

export const WEBHOOK_PROVIDERS = [
    {
        id: "webhook",
        label: "Custom Webhook",
        description: "Send the full signed JSON event payload to any endpoint.",
        defaultUrl: "https://hooks.example.com/osonflow",
    },
    {
        id: "discord",
        label: "Discord",
        description: "Post rich event messages into a Discord channel via webhook.",
        defaultUrl: "https://discord.com/api/webhooks/...",
    },
    {
        id: "telegram",
        label: "Telegram",
        description: "Push event updates with your Telegram bot into a chat.",
        defaultUrl: "https://api.telegram.org/sendMessage",
    },
    {
        id: "whatsapp",
        label: "WhatsApp",
        description: "Deliver event updates through WhatsApp Cloud API.",
        defaultUrl: "https://graph.facebook.com/v19.0/messages",
    },
] as const;

export type WebhookProvider = (typeof WEBHOOK_PROVIDERS)[number]["id"];

export type IntegrationSnippetOptions = {
    organizationId: string;
    scriptUrl: string;
    position: WidgetPosition;
};

const createHtmlSnippet = ({
    organizationId,
    scriptUrl,
    position,
}: IntegrationSnippetOptions) => `<!-- Echo support widget -->
<script
  src="${scriptUrl}"
  data-organization-id="${organizationId}"
  data-position="${position}"
  defer
></script>`;

const createReactSnippet = ({
    organizationId,
    scriptUrl,
    position,
}: IntegrationSnippetOptions) => `import { useEffect } from "react";

export const EchoWidget = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${scriptUrl}";
    script.defer = true;
    script.dataset.organizationId = "${organizationId}";
    script.dataset.position = "${position}";

    document.body.appendChild(script);

    return () => {
      const widget = (window as Window & { EchoWidget?: { destroy?: () => void } }).EchoWidget;
      widget?.destroy?.();
      script.remove();
    };
  }, []);

  return null;
};`;

const createNextSnippet = ({
    organizationId,
    scriptUrl,
    position,
}: IntegrationSnippetOptions) => `import Script from "next/script";

export const EchoWidgetScript = () => (
  <Script
    id="echo-widget"
    src="${scriptUrl}"
    strategy="afterInteractive"
    data-organization-id="${organizationId}"
    data-position="${position}"
  />
);`;

const createJavascriptSnippet = ({
    organizationId,
    scriptUrl,
    position,
}: IntegrationSnippetOptions) => `(function initEchoWidget() {
  const script = document.createElement("script");
  script.src = "${scriptUrl}";
  script.defer = true;
  script.dataset.organizationId = "${organizationId}";
  script.dataset.position = "${position}";

  document.head.appendChild(script);
})();`;

export const INTEGRATION_SNIPPET_BUILDERS: Record<
    IntegrationId,
    (options: IntegrationSnippetOptions) => string
> = {
    html5: createHtmlSnippet,
    react: createReactSnippet,
    nextjs: createNextSnippet,
    javascript: createJavascriptSnippet,
};
