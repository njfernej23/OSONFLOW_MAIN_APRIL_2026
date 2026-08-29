import {
  BellRingIcon,
  HashIcon,
  MailCheckIcon,
  MailIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PhoneIcon,
  SendIcon,
  SmartphoneIcon,
  UsersRoundIcon,
} from "lucide-react"

import {
  bearerAuth,
  headerAuth,
  opt,
  p,
  plannedBlueprint,
  restBlueprint,
  secretUrlAuth,
} from "./helpers"
import type { ToolBlueprint } from "./types"

/** Reaching a person or a channel — the most common first integration. */
export const messagingBlueprints: ToolBlueprint[] = [
  restBlueprint({
    id: "slack_alert",
    title: "Slack alert",
    vendor: "Slack",
    brand: "#611f69",
    category: "messaging",
    icon: MessagesSquareIcon,
    tone: "info",
    effect: "notify",
    featured: true,
    summary:
      "Post into a Slack channel through an incoming webhook when the assistant needs a human to look.",
    tags: ["Incoming webhook", "Notify"],
    highlights: [
      "No Slack app review — an incoming webhook URL is the whole setup.",
      "The webhook is already scoped to one channel, so the assistant cannot post anywhere else.",
      "Safe on voice: the assistant can raise a flag mid-call without leaving the call.",
    ],
    auth: secretUrlAuth(
      "Incoming webhook URL",
      "The URL is the credential — treat it as a secret."
    ),
    hostHints: ["hooks.slack.com"],
    endpointPlaceholder:
      "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX",
    docsUrl: "https://api.slack.com/messaging/webhooks",
    setupHint:
      "Create an incoming webhook in your Slack workspace and paste its URL as the endpoint.",
    voice: true,
    tool: {
      name: "send_slack_alert",
      description:
        "Post a short alert into the team's Slack channel when a conversation needs attention.",
      method: "POST",
      body: { text: "{{message}}" },
      parameters: [p("message", "The alert text to post in Slack.")],
    },
  }),
  restBlueprint({
    id: "slack_post_message",
    title: "Slack channel message",
    vendor: "Slack",
    brand: "#611f69",
    category: "messaging",
    icon: HashIcon,
    tone: "info",
    effect: "notify",
    summary:
      "Post to any channel your bot is in through the Web API, with threading and rich text.",
    tags: ["Web API", "Bot token", "Notify"],
    highlights: [
      "One bot token reaches every channel the bot has been invited to.",
      "Set the channel id once in the body template to pin the tool to a room.",
      "Supports Slack markdown, so links and code render properly.",
    ],
    auth: bearerAuth(
      "Bot user OAuth token",
      "Starts with xoxb- — found under OAuth & Permissions in your Slack app.",
      "https://api.slack.com/authentication/token-types#bot"
    ),
    hostHints: ["slack.com/api"],
    endpoint: "https://slack.com/api/chat.postMessage",
    endpointPlaceholder: "https://slack.com/api/chat.postMessage",
    docsUrl: "https://api.slack.com/methods/chat.postMessage",
    setupHint:
      "Paste the bot token as the credential and replace the channel id in the body template.",
    tool: {
      name: "post_slack_message",
      description:
        "Post a message into the team's Slack channel using the workspace bot.",
      method: "POST",
      headers: { Authorization: "Bearer xoxb-your-bot-token" },
      body: { channel: "C0000000000", text: "{{message}}" },
      parameters: [p("message", "The message to post in Slack.")],
    },
  }),
  restBlueprint({
    id: "discord_alert",
    title: "Discord alert",
    vendor: "Discord",
    brand: "#5865f2",
    category: "messaging",
    icon: MessagesSquareIcon,
    tone: "accent",
    effect: "notify",
    summary:
      "Send the assistant's message to a Discord channel webhook — useful for community and ops rooms.",
    tags: ["Webhook", "Notify"],
    highlights: [
      "Channel settings → Integrations → Webhooks is the entire setup.",
      "Post as a named bot with your own avatar by extending the body template.",
    ],
    auth: secretUrlAuth(
      "Channel webhook URL",
      "Anyone with this URL can post to the channel."
    ),
    hostHints: ["discord.com/api/webhooks"],
    endpointPlaceholder:
      "https://discord.com/api/webhooks/000000000000/XXXXXXXXXXXXXXXX",
    docsUrl: "https://discord.com/developers/docs/resources/webhook",
    setupHint:
      "Channel settings → Integrations → Webhooks → copy the webhook URL.",
    voice: true,
    tool: {
      name: "send_discord_alert",
      description: "Post an alert message into the team's Discord channel.",
      method: "POST",
      body: { content: "{{message}}" },
      parameters: [p("message", "The message to post in Discord.")],
    },
  }),
  restBlueprint({
    id: "telegram_message",
    title: "Telegram message",
    vendor: "Telegram",
    brand: "#26a5e4",
    category: "messaging",
    icon: SendIcon,
    tone: "info",
    effect: "notify",
    summary:
      "Deliver a message through your Telegram bot to a chat or group the team watches.",
    tags: ["Bot API", "Notify"],
    highlights: [
      "Works with groups, channels and one-to-one chats.",
      "The bot token sits in the endpoint, so no extra header is needed.",
    ],
    auth: secretUrlAuth(
      "Bot token in the endpoint",
      "The token is part of the URL — rotate it in BotFather if it leaks."
    ),
    hostHints: ["api.telegram.org"],
    endpointPlaceholder: "https://api.telegram.org/bot<bot-token>/sendMessage",
    docsUrl: "https://core.telegram.org/bots/api#sendmessage",
    setupHint:
      "Put your bot token in the endpoint and the destination chat id in the body template.",
    voice: true,
    tool: {
      name: "send_telegram_message",
      description: "Send a message to the team's Telegram chat.",
      method: "POST",
      body: { chat_id: "000000000", text: "{{message}}" },
      parameters: [p("message", "The message text to send.")],
    },
  }),
  restBlueprint({
    id: "teams_alert",
    title: "Microsoft Teams alert",
    vendor: "Microsoft Teams",
    brand: "#6264a7",
    category: "messaging",
    icon: UsersRoundIcon,
    tone: "accent",
    effect: "notify",
    summary:
      "Drop a card into a Teams channel through a Workflows (Power Automate) webhook.",
    tags: ["Workflows", "Notify"],
    highlights: [
      "Uses the Workflows connector that replaced Office 365 connectors.",
      "The flow URL is channel-scoped, so the assistant cannot address the whole tenant.",
    ],
    auth: secretUrlAuth(
      "Workflow HTTP trigger URL",
      "Created from the channel's Workflows → Post to a channel when a webhook request is received."
    ),
    hostHints: ["logic.azure.com", "webhook.office.com"],
    endpointPlaceholder:
      "https://prod-00.westus.logic.azure.com:443/workflows/…/triggers/manual/paths/invoke",
    docsUrl:
      "https://support.microsoft.com/en-us/office/create-incoming-webhooks-with-workflows-for-microsoft-teams-8ae491c7-0394-4861-ba59-055e33f75498",
    setupHint:
      "Create the Workflows trigger in the Teams channel and paste its URL here.",
    tool: {
      name: "send_teams_alert",
      description: "Post an alert into the team's Microsoft Teams channel.",
      method: "POST",
      body: { text: "{{message}}" },
      parameters: [p("message", "The alert text to post in Teams.")],
    },
  }),
  restBlueprint({
    id: "whatsapp_message",
    title: "WhatsApp message",
    vendor: "WhatsApp Cloud API",
    brand: "#25d366",
    category: "messaging",
    icon: MessageCircleIcon,
    tone: "positive",
    effect: "notify",
    summary:
      "Reply to a customer on WhatsApp with a template or a free-form message inside the service window.",
    tags: ["Cloud API", "Bearer", "Customer"],
    highlights: [
      "Sends through your own WhatsApp Business number.",
      "Free-form text only works inside the 24-hour service window — use a template outside it.",
    ],
    auth: bearerAuth(
      "System user access token",
      "Generated in Meta Business settings for the WhatsApp app.",
      "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
    ),
    hostHints: ["graph.facebook.com"],
    endpointPlaceholder:
      "https://graph.facebook.com/v21.0/<phone-number-id>/messages",
    docsUrl:
      "https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages",
    setupHint:
      "Put your phone number id in the endpoint and the system user token in the credential field.",
    tool: {
      name: "send_whatsapp_message",
      description:
        "Send a WhatsApp message to a customer's phone number in E.164 format.",
      method: "POST",
      headers: { Authorization: "Bearer EAAG…" },
      body: {
        messaging_product: "whatsapp",
        to: "{{to}}",
        type: "text",
        text: { body: "{{message}}" },
      },
      parameters: [
        p("to", "Destination phone number in E.164 format, e.g. +14155550123."),
        p("message", "The message body to send."),
      ],
    },
  }),
  restBlueprint({
    id: "twilio_sms",
    title: "SMS message",
    vendor: "Twilio",
    brand: "#f22f46",
    category: "messaging",
    icon: PhoneIcon,
    tone: "critical",
    effect: "notify",
    summary:
      "Text a customer a code, a confirmation or a link straight from the conversation.",
    tags: ["SMS", "Basic auth", "Form encoded"],
    highlights: [
      "Form-encoded, exactly as the Twilio Messages resource expects.",
      "Your sending number is fixed in the body, so the assistant only chooses the recipient.",
    ],
    auth: {
      kind: "basic",
      label: "Account SID and auth token",
      hint: "Base64 of ACxxxx:auth_token — from the Twilio console.",
      docsUrl: "https://www.twilio.com/docs/iam/credentials/api",
    },
    hostHints: ["api.twilio.com"],
    endpointPlaceholder:
      "https://api.twilio.com/2010-04-01/Accounts/ACxxxxxxxx/Messages.json",
    docsUrl: "https://www.twilio.com/docs/messaging/api/message-resource",
    setupHint:
      "Twilio expects form encoding — keep the content type header and set your sending number in the body.",
    tool: {
      name: "send_sms",
      description: "Send an SMS message to a customer phone number.",
      method: "POST",
      headers: {
        Authorization: "Basic BASE64_OF_ACCOUNT_SID_COLON_AUTH_TOKEN",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "To={{to}}&From=%2B15550000000&Body={{message}}",
      parameters: [
        p("to", "Destination phone number in E.164 format."),
        p("message", "The SMS body to send."),
      ],
    },
  }),
  restBlueprint({
    id: "twilio_whatsapp",
    title: "WhatsApp via Twilio",
    vendor: "Twilio",
    brand: "#f22f46",
    category: "messaging",
    icon: SmartphoneIcon,
    tone: "critical",
    effect: "notify",
    summary:
      "Send WhatsApp messages on the Twilio number you already run your SMS traffic through.",
    tags: ["WhatsApp", "Basic auth"],
    highlights: [
      "Same credentials and console as your Twilio SMS traffic.",
      "The whatsapp: prefix on both numbers is what routes it off SMS.",
    ],
    auth: {
      kind: "basic",
      label: "Account SID and auth token",
      hint: "Base64 of ACxxxx:auth_token — from the Twilio console.",
      docsUrl: "https://www.twilio.com/docs/iam/credentials/api",
    },
    hostHints: ["api.twilio.com"],
    endpointPlaceholder:
      "https://api.twilio.com/2010-04-01/Accounts/ACxxxxxxxx/Messages.json",
    docsUrl: "https://www.twilio.com/docs/whatsapp/api",
    setupHint:
      "Prefix both numbers with whatsapp: — the sending number is already set in the body.",
    tool: {
      name: "send_whatsapp_via_twilio",
      description: "Send a WhatsApp message to a customer through Twilio.",
      method: "POST",
      headers: {
        Authorization: "Basic BASE64_OF_ACCOUNT_SID_COLON_AUTH_TOKEN",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "To=whatsapp%3A{{to}}&From=whatsapp%3A%2B15550000000&Body={{message}}",
      parameters: [
        p("to", "Destination number in E.164 format, without the prefix."),
        p("message", "The message body to send."),
      ],
    },
  }),
  restBlueprint({
    id: "resend_email",
    title: "Transactional email",
    vendor: "Resend",
    brand: "#8b8b8b",
    category: "messaging",
    icon: MailIcon,
    tone: "accent",
    effect: "notify",
    featured: true,
    summary:
      "Let the assistant send a confirmation, summary or follow-up email from your own domain.",
    tags: ["Email", "REST", "Bearer"],
    highlights: [
      "Sends from a domain you have already verified, so it lands in the inbox.",
      "The from-address is fixed in the template — the assistant only fills recipient, subject and body.",
      "Accepts simple HTML, so a summary can keep its formatting.",
    ],
    auth: bearerAuth(
      "Resend API key",
      "Starts with re_ — created under API Keys in the Resend dashboard.",
      "https://resend.com/api-keys"
    ),
    hostHints: ["api.resend.com"],
    endpoint: "https://api.resend.com/emails",
    endpointPlaceholder: "https://api.resend.com/emails",
    docsUrl: "https://resend.com/docs/api-reference/emails/send-email",
    setupHint:
      "Add your Resend API key as the bearer token and set the verified from-address in the body.",
    tool: {
      name: "send_email",
      description:
        "Send a transactional email to the customer with a subject and body.",
      method: "POST",
      headers: { Authorization: "Bearer re_your_api_key" },
      body: {
        from: "assistant@yourdomain.com",
        to: ["{{to}}"],
        subject: "{{subject}}",
        html: "{{body}}",
      },
      parameters: [
        p("to", "Recipient email address."),
        p("subject", "Subject line of the email."),
        p("body", "Body of the email, in plain text or simple HTML."),
      ],
    },
  }),
  restBlueprint({
    id: "sendgrid_email",
    title: "Email via SendGrid",
    vendor: "SendGrid",
    brand: "#1a82e2",
    category: "messaging",
    icon: MailCheckIcon,
    tone: "info",
    effect: "notify",
    summary:
      "Send through the SendGrid mail pipeline your marketing and product email already uses.",
    tags: ["Email", "Bearer"],
    highlights: [
      "Reuses the sender identity and suppression lists you already maintain.",
      "Returns 202 with an empty body on success — the assistant sees the confirmation, not a payload.",
    ],
    auth: bearerAuth(
      "SendGrid API key",
      "Needs only the Mail Send permission.",
      "https://app.sendgrid.com/settings/api_keys"
    ),
    hostHints: ["api.sendgrid.com"],
    endpoint: "https://api.sendgrid.com/v3/mail/send",
    endpointPlaceholder: "https://api.sendgrid.com/v3/mail/send",
    docsUrl:
      "https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send",
    setupHint:
      "Set the verified from-address in the body template, then paste a Mail Send API key.",
    tool: {
      name: "send_email_sendgrid",
      description: "Send an email to the customer through SendGrid.",
      method: "POST",
      headers: { Authorization: "Bearer SG.your_api_key" },
      body: {
        personalizations: [{ to: [{ email: "{{to}}" }] }],
        from: { email: "assistant@yourdomain.com" },
        subject: "{{subject}}",
        content: [{ type: "text/plain", value: "{{body}}" }],
      },
      parameters: [
        p("to", "Recipient email address."),
        p("subject", "Subject line of the email."),
        p("body", "Plain-text body of the email."),
      ],
    },
  }),
  restBlueprint({
    id: "postmark_email",
    title: "Email via Postmark",
    vendor: "Postmark",
    brand: "#ffcf00",
    category: "messaging",
    icon: MailIcon,
    tone: "warning",
    effect: "notify",
    summary:
      "Transactional delivery on a separate stream, so assistant mail never mixes with bulk sends.",
    tags: ["Email", "Server token"],
    highlights: [
      "Message streams keep transactional mail off your broadcast reputation.",
      "The server token scopes the tool to one Postmark server.",
    ],
    auth: headerAuth(
      "X-Postmark-Server-Token",
      "Postmark server token",
      "Found under the server's API Tokens tab.",
      "https://postmarkapp.com/developer/api/overview"
    ),
    hostHints: ["api.postmarkapp.com"],
    endpoint: "https://api.postmarkapp.com/email",
    endpointPlaceholder: "https://api.postmarkapp.com/email",
    docsUrl: "https://postmarkapp.com/developer/api/email-api",
    setupHint:
      "Paste the server token and set a verified sender signature in the body template.",
    tool: {
      name: "send_email_postmark",
      description: "Send a transactional email through Postmark.",
      method: "POST",
      headers: { "X-Postmark-Server-Token": "your-server-token" },
      body: {
        From: "assistant@yourdomain.com",
        To: "{{to}}",
        Subject: "{{subject}}",
        TextBody: "{{body}}",
        MessageStream: "outbound",
      },
      parameters: [
        p("to", "Recipient email address."),
        p("subject", "Subject line of the email."),
        p("body", "Plain-text body of the email."),
      ],
    },
  }),
  restBlueprint({
    id: "pagerduty_incident",
    title: "PagerDuty incident",
    vendor: "PagerDuty",
    brand: "#06ac38",
    category: "messaging",
    icon: BellRingIcon,
    tone: "positive",
    effect: "notify",
    summary:
      "Raise an incident on the on-call rotation when a conversation turns into an outage report.",
    tags: ["Events API", "On-call"],
    highlights: [
      "Goes through Events API v2, so routing and escalation policies still apply.",
      "Severity is a parameter, so the assistant can distinguish a nuisance from an outage.",
      "A dedup key stops one recurring complaint from paging twice.",
    ],
    auth: {
      kind: "none",
      label: "Routing key in the body",
      hint: "The integration routing key identifies the service — it lives in the body template.",
      docsUrl: "https://developer.pagerduty.com/docs/events-api-v2-overview",
    },
    hostHints: ["events.pagerduty.com"],
    endpoint: "https://events.pagerduty.com/v2/enqueue",
    endpointPlaceholder: "https://events.pagerduty.com/v2/enqueue",
    docsUrl:
      "https://developer.pagerduty.com/api-reference/YXBpOjI3NDgyNjU-events-api-v2",
    setupHint:
      "Replace the routing key in the body template with your service's integration key.",
    tool: {
      name: "create_pagerduty_incident",
      description:
        "Raise a PagerDuty incident when the customer reports something broken in production.",
      method: "POST",
      body: {
        routing_key: "your-32-character-routing-key",
        event_action: "trigger",
        dedup_key: "{{dedup_key}}",
        payload: {
          summary: "{{summary}}",
          severity: "{{severity}}",
          source: "osonflow-assistant",
        },
      },
      parameters: [
        p("summary", "One-line description of what is broken."),
        p("severity", "One of critical, error, warning or info."),
        opt(
          "dedup_key",
          "Stable key for the same underlying problem, so repeats group into one incident."
        ),
      ],
    },
  }),
  plannedBlueprint({
    id: "gmail_send",
    title: "Gmail send",
    vendor: "Google Workspace",
    brand: "#ea4335",
    category: "messaging",
    icon: MailIcon,
    summary:
      "Send from a real mailbox so the reply lands in the thread the customer already knows.",
    tags: ["OAuth", "Email"],
    effect: "notify",
    highlights: [
      "Needs a Google Workspace OAuth grant per mailbox.",
      "Replies thread against the original message rather than starting a new one.",
    ],
  }),
]
