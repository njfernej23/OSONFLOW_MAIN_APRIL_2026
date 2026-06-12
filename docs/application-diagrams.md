# Osonflow Application Diagrams

Generated from the current application structure:

- Frontend: `apps/web`, `apps/widget`, `apps/embed`
- Backend: `packages/backend/convex`
- Main data model source: `packages/backend/convex/schema.ts`

## Class Diagram

```mermaid
classDiagram
direction LR

class Organization {
  +string organizationId
  +selectWorkspace()
  +manageMembers()
}

class DashboardOperator {
  +string userId
  +signIn()
  +selectOrganization()
  +manageInbox()
  +customizeWidget()
  +configureIntegrations()
  +designWorkflows()
  +reviewAnalytics()
  +manageBilling()
}

class CustomerContact {
  +string name
  +string email
  +startSession()
  +sendChatMessage()
  +startVoiceConversation()
  +requestHumanSupport()
}

class WidgetApp {
  +renderScreen(screen)
  +createContactSession()
  +startConversation()
  +sendMessage()
  +startVoiceSession()
}

class EmbedScript {
  +loadWidget()
  +mountLauncher()
  +applyOrganizationConfig()
}

class ConvexBackend {
  +publicQueries()
  +privateQueries()
  +mutations()
  +actions()
  +httpWebhooks()
}

class SupportAgent {
  +createThread()
  +listMessages()
  +answerWithKnowledgeBase()
  +escalateConversation()
  +resolveConversation()
  +cacheReply()
}

class KnowledgeBase {
  +addFile()
  +addWebsite()
  +search()
  +testAnswer()
  +deleteEntry()
}

class WidgetSettings {
  +string greetMessage
  +string systemPrompt
  +object theme
  +object appearance
  +saveDraft()
  +publishDraft()
  +rollbackToVersion()
}

class WidgetSettingsVersion {
  +number version
  +object settings
  +number publishedAt
  +string action
}

class ContactSession {
  +string name
  +string email
  +number expiresAt
  +object metadata
  +validate()
  +refresh()
}

class Conversation {
  +string threadId
  +string status
  +string assignedToId
  +markAsRead()
  +assignOperator()
  +updateStatus()
  +exportTranscript()
}

class AgentThread {
  +string threadId
  +appendMessage()
  +listMessages()
  +textSearch()
}

class AIVoiceConversation {
  +string provider
  +string status
  +appendTranscript()
  +escalateToHuman()
  +resolve()
  +finish()
}

class AIVoiceMessage {
  +string role
  +string text
}

class Workflow {
  +string name
  +object definition
  +save()
  +publish()
  +deactivate()
}

class WorkflowSession {
  +string status
  +string currentNodeId
  +object variables
  +handleUserMessage()
  +advance()
  +end()
}

class WorkflowNode {
  +string id
  +string type
  +object position
  +object data
}

class Integration {
  +string provider
  +connect()
  +disconnect()
  +receiveWebhook()
  +sendConversationMessage()
}

class IntegrationWebhook {
  +string url
  +bool isEnabled
  +stringArray eventTypes
  +dispatchEvent()
  +recordDeliveryResult()
}

class Subscription {
  +string status
  +string provider
  +syncFromWebhook()
}

class ConversationInsight {
  +string channel
  +string intent
  +string sentiment
  +string urgency
  +analyzeConversation()
}

class CustomerMemory {
  +string email
  +string summary
  +stringArray recentIntents
  +updateFromInsight()
}

Organization "1" --> "0..*" DashboardOperator : has members
Organization "1" --> "0..1" Subscription : owns
Organization "1" --> "1" WidgetSettings : configures
Organization "1" --> "0..*" Integration : enables
Organization "1" --> "0..*" IntegrationWebhook : notifies
Organization "1" --> "0..*" Workflow : designs
Organization "1" --> "0..*" CustomerMemory : remembers

DashboardOperator --> ConvexBackend : uses private API
DashboardOperator --> WidgetSettings : edits
DashboardOperator --> Conversation : manages
DashboardOperator --> Workflow : builds
DashboardOperator --> KnowledgeBase : manages

CustomerContact --> WidgetApp : uses
EmbedScript --> WidgetApp : mounts
WidgetApp --> ConvexBackend : uses public API
WidgetApp --> ContactSession : creates
WidgetApp --> Conversation : opens
WidgetApp --> AIVoiceConversation : starts

ConvexBackend --> SupportAgent : delegates AI chat
SupportAgent --> KnowledgeBase : searches RAG
SupportAgent --> AgentThread : stores messages
Conversation "1" --> "1" AgentThread : uses threadId
ContactSession "1" --> "0..*" Conversation : starts
ContactSession "1" --> "0..*" AIVoiceConversation : starts
AIVoiceConversation "1" --> "0..*" AIVoiceMessage : contains
Conversation "0..1" --> "0..*" WorkflowSession : runs
Workflow "1" --> "0..*" WorkflowSession : instantiates
Workflow "1" --> "1..*" WorkflowNode : defines
Conversation "0..1" --> "0..*" ConversationInsight : analyzed as chat
AIVoiceConversation "0..1" --> "0..*" ConversationInsight : analyzed as voice
CustomerMemory --> ContactSession : last session
WidgetSettings "1" --> "0..*" WidgetSettingsVersion : publishes
Integration --> ContactSession : maps channel contact
IntegrationWebhook "1" --> "0..*" WebhookDelivery : produces
```

## Use Case Diagram

```mermaid
flowchart LR
  Operator[Dashboard operator]
  Customer[Customer contact]
  Clerk[Clerk auth]
  Polar[Polar billing]
  AI[AI providers<br/>OpenAI, Gemini, Vapi]
  Channels[Channel providers<br/>Telegram, Instagram]
  Webhooks[External webhook receivers]

  subgraph Platform[Osonflow support platform]
    UC1((Sign in and select organization))
    UC2((Manage team and account settings))
    UC3((Customize support widget))
    UC4((Publish widget settings))
    UC5((Upload files and website knowledge))
    UC6((Test knowledge base answers))
    UC7((Configure AI voice plugins))
    UC8((Connect Telegram or Instagram))
    UC9((Configure outbound webhooks))
    UC10((Build and publish workflows))
    UC11((Monitor live workflow presence))
    UC12((View chat inbox))
    UC13((Reply to customer))
    UC14((Assign or change conversation status))
    UC15((Use saved replies))
    UC16((Export conversation transcript))
    UC17((View AI voice conversations))
    UC18((Review analytics and insights))
    UC19((Review customer memory))
    UC20((Manage subscription and billing))

    UC21((Load embedded widget))
    UC22((Create contact session))
    UC23((Browse help center))
    UC24((Start chat conversation))
    UC25((Send customer message))
    UC26((Receive AI answer))
    UC27((Escalate to human support))
    UC28((Start voice conversation))
    UC29((Download chat history))

    UC30((Receive channel webhook))
    UC31((Dispatch integration event))
    UC32((Sync subscription status))
    UC33((Analyze conversation intelligence))
  end

  Operator --> UC1
  Operator --> UC2
  Operator --> UC3
  Operator --> UC4
  Operator --> UC5
  Operator --> UC6
  Operator --> UC7
  Operator --> UC8
  Operator --> UC9
  Operator --> UC10
  Operator --> UC11
  Operator --> UC12
  Operator --> UC13
  Operator --> UC14
  Operator --> UC15
  Operator --> UC16
  Operator --> UC17
  Operator --> UC18
  Operator --> UC19
  Operator --> UC20

  Customer --> UC21
  Customer --> UC22
  Customer --> UC23
  Customer --> UC24
  Customer --> UC25
  Customer --> UC27
  Customer --> UC28
  Customer --> UC29

  Clerk --> UC1
  Clerk --> UC2
  Polar --> UC20
  Polar --> UC32
  AI --> UC26
  AI --> UC28
  Channels --> UC30
  Channels --> UC8
  Webhooks --> UC31

  UC3 -. includes .-> UC4
  UC5 -. includes .-> UC6
  UC24 -. includes .-> UC22
  UC25 -. includes .-> UC26
  UC26 -. extends .-> UC27
  UC28 -. may create .-> UC17
  UC30 -. creates or updates .-> UC24
  UC12 -. includes .-> UC13
  UC13 -. uses .-> UC15
  UC14 -. triggers .-> UC31
  UC25 -. triggers .-> UC33
  UC28 -. triggers .-> UC33
```

## ER Diagram

```mermaid
erDiagram
  ORGANIZATION ||--o| SUBSCRIPTION : has
  ORGANIZATION ||--o| WIDGET_SETTINGS : configures
  ORGANIZATION ||--o{ WIDGET_SETTINGS_VERSION : publishes
  ORGANIZATION ||--o{ PLUGIN : stores_secrets_for
  ORGANIZATION ||--o{ INTEGRATION_WEBHOOK : owns
  INTEGRATION_WEBHOOK ||--o{ WEBHOOK_DELIVERY : records
  ORGANIZATION ||--o{ TELEGRAM_INTEGRATION : connects
  TELEGRAM_INTEGRATION ||--o{ TELEGRAM_CONTACT : maps
  ORGANIZATION ||--o{ INSTAGRAM_INTEGRATION : connects
  INSTAGRAM_INTEGRATION ||--o{ INSTAGRAM_CONTACT : maps
  ORGANIZATION ||--o{ CONTACT_SESSION : receives
  CONTACT_SESSION ||--o{ CONVERSATION : opens
  CONTACT_SESSION ||--o{ AI_VOICE_CONVERSATION : opens
  CONTACT_SESSION ||--o{ CONVERSATION_INSIGHT : analyzed_for
  TELEGRAM_CONTACT }o--|| CONTACT_SESSION : identifies
  TELEGRAM_CONTACT }o--o| CONVERSATION : active_chat
  INSTAGRAM_CONTACT }o--|| CONTACT_SESSION : identifies
  INSTAGRAM_CONTACT }o--o| CONVERSATION : active_chat
  AI_VOICE_CONVERSATION ||--o{ AI_VOICE_CONVERSATION_MESSAGE : contains
  AI_VOICE_CONVERSATION }o--o| CONVERSATION : linked_to
  CONVERSATION ||--o{ CONVERSATION_INSIGHT : has
  AI_VOICE_CONVERSATION ||--o{ CONVERSATION_INSIGHT : has
  ORGANIZATION ||--o{ AI_REPLY_CACHE : caches
  ORGANIZATION ||--o{ SAVED_REPLY : owns
  ORGANIZATION ||--o{ WORKFLOW : owns
  WORKFLOW ||--o{ WORKFLOW_SESSION : runs
  CONVERSATION ||--o{ WORKFLOW_SESSION : uses
  CONTACT_SESSION ||--o{ WORKFLOW_SESSION : participates
  WORKFLOW ||--o{ WORKFLOW_PRESENCE : edited_by
  ORGANIZATION ||--o{ CUSTOMER_MEMORY : stores
  CUSTOMER_MEMORY }o--o| CONTACT_SESSION : last_seen_in

  ORGANIZATION {
    string organizationId PK "External Clerk organization id"
  }

  SUBSCRIPTION {
    id _id PK
    string organizationId FK
    string status
    string provider
    string polarCustomerId
    string polarProductId
    string polarSubscriptionId
    number currentPeriodEnd
    number updatedAt
  }

  WIDGET_SETTINGS {
    id _id PK
    string organizationId FK
    string greetMessage
    string systemPrompt
    object chatSettings
    object defaultSuggestions
    object helpTopics
    object homeCards
    object vapiSettings
    object openaiRealtimeSettings
    object geminiLiveSettings
    object theme
    object appearance
    object draft
    number publishedVersion
    number publishedAt
    string publishedBy
    number draftUpdatedAt
    string draftUpdatedBy
  }

  WIDGET_SETTINGS_VERSION {
    id _id PK
    string organizationId FK
    number version
    object settings
    number publishedAt
    string publishedBy
    string action
    number sourceVersion
  }

  PLUGIN {
    id _id PK
    string organizationId FK
    string service "vapi|openai_realtime|gemini_live"
    string secretName
    string secretValue
  }

  INTEGRATION_WEBHOOK {
    id _id PK
    string organizationId FK
    string url
    string description
    string provider "webhook|discord|slack|telegram|whatsapp"
    object providerConfig
    string signingSecret
    bool isEnabled
    array eventTypes
    string createdBy
    number updatedAt
  }

  WEBHOOK_DELIVERY {
    id _id PK
    string organizationId FK
    id webhookId FK
    string eventId
    string eventType
    string targetUrl
    string status "success|failed"
    number attempt
    number responseStatus
    string responseBody
    string error
    object payload
    number durationMs
  }

  TELEGRAM_INTEGRATION {
    id _id PK
    string organizationId FK
    string botToken
    number botId
    string botUsername
    string webhookSecret
    string webhookUrl
    bool isEnabled
    string status
    string setupError
    number lastWebhookAt
    string createdBy
    number createdAt
    number updatedAt
  }

  TELEGRAM_CONTACT {
    id _id PK
    string organizationId FK
    id integrationId FK
    string chatId
    string userId
    string username
    string firstName
    string lastName
    id contactSessionId FK
    id activeConversationId FK
    number lastMessageAt
    number createdAt
    number updatedAt
  }

  INSTAGRAM_INTEGRATION {
    id _id PK
    string organizationId FK
    string accessToken
    string instagramUserId
    string username
    string webhookSecret
    string verifyToken
    string webhookUrl
    bool isEnabled
    string status
    string setupError
    number lastWebhookAt
    string createdBy
    number createdAt
    number updatedAt
  }

  INSTAGRAM_CONTACT {
    id _id PK
    string organizationId FK
    id integrationId FK
    string senderId
    string username
    string fullName
    string profilePicUrl
    number followerCount
    id contactSessionId FK
    id activeConversationId FK
    number lastMessageAt
    number createdAt
    number updatedAt
  }

  CONTACT_SESSION {
    id _id PK
    string organizationId FK
    string name
    string email
    number expiresAt
    bool isAnonymous
    object metadata
  }

  CONVERSATION {
    id _id PK
    string threadId "Convex Agent thread id"
    string organizationId FK
    id contactSessionId FK
    string status "unresolved|escalated|resolved"
    bool isArchived
    string assignedToId
    string assignedToName
    number assignedAt
    number contactLastReadAt
    number operatorLastReadAt
    number unreadForContactCount
    number unreadForOperatorCount
    number escalatedAt
    number resolvedAt
    string resolutionSource
  }

  AI_REPLY_CACHE {
    id _id PK
    string organizationId FK
    string cacheKey
    string systemPromptKey
    string model
    string sourcePrompt
    string answer
    string sourceThreadId
    string semanticEntryId
    number hitCount
    number createdAt
    number updatedAt
    number lastUsedAt
  }

  SAVED_REPLY {
    id _id PK
    string organizationId FK
    string title
    string body
    string category
    number usageCount
    number updatedAt
    string createdBy
  }

  WORKFLOW {
    id _id PK
    string organizationId FK
    string name
    string description
    object definition
    object publishedDefinition
    bool isActive
    number publishedAt
    string publishedBy
    number createdAt
    number updatedAt
    string createdBy
    string updatedBy
  }

  WORKFLOW_SESSION {
    id _id PK
    string organizationId FK
    id workflowId FK
    id conversationId FK
    id contactSessionId FK
    string status "active|waiting|ended"
    string currentNodeId
    string pendingNodeId
    array pendingButtons
    object variables
    number startedAt
    number updatedAt
    number endedAt
  }

  WORKFLOW_PRESENCE {
    id _id PK
    string organizationId FK
    id workflowId FK
    string userId
    string name
    string initials
    string imageUrl
    string color
    number cursorX
    number cursorY
    string selectedNodeId
    number lastSeenAt
  }

  AI_VOICE_CONVERSATION {
    id _id PK
    string organizationId FK
    id contactSessionId FK
    string provider "openai_realtime|gemini_live|vapi"
    string status "unresolved|escalated|resolved"
    id linkedConversationId FK
    number lastActivityAt
    number endedAt
    string lastMessagePreview
    string lastMessageRole
    number operatorLastReadAt
    number unreadForOperatorCount
    number escalatedAt
    number resolvedAt
    string resolutionSource
  }

  AI_VOICE_CONVERSATION_MESSAGE {
    id _id PK
    id conversationId FK
    string role "user|assistant"
    string text
  }

  CONVERSATION_INSIGHT {
    id _id PK
    string organizationId FK
    string channel "chat|voice"
    id conversationId FK
    id aiVoiceConversationId FK
    id contactSessionId FK
    string status
    string intent
    string sentiment
    string urgency
    string language
    string summary
    bool isUnanswered
    string unansweredQuestion
    bool wasEscalated
    bool wasResolved
    string resolutionSource
    number firstHumanResponseMs
    number humanSavedMinutes
    number lastAnalyzedAt
    number updatedAt
  }

  CUSTOMER_MEMORY {
    id _id PK
    string organizationId FK
    string email
    string name
    string summary
    string preferredLanguage
    array recentIntents
    array notableFacts
    array issueHistory
    number totalConversations
    number totalEscalations
    number totalResolved
    number lastSeenAt
    id lastContactSessionId FK
    number updatedAt
  }
```

## Business Process Diagram

```mermaid
flowchart TB
  Start((Start))
  End((End))

  subgraph Setup[Organization setup]
    S1[Operator signs in with Clerk]
    S2[Select or create organization]
    S3[Configure subscription and billing]
    S4[Customize widget branding, greetings, AI prompts, help center, and voice settings]
    S5[Upload files or website content to knowledge base]
    S6[Test knowledge base answer quality]
    S7[Connect AI, Telegram, Instagram, and webhook integrations]
    S8[Build and publish optional automation workflows]
    S9[Publish widget settings]
  end

  subgraph CustomerEntry[Customer entry]
    C1[Embedded launcher loads on customer site]
    C2{Customer chooses channel}
    C3[Open web chat]
    C4[Start AI voice session]
    C5[Send Telegram or Instagram message]
    C6[Create or validate contact session]
  end

  subgraph ConversationFlow[Conversation handling]
    H1[Create conversation or voice conversation record]
    H2[Store customer message or voice transcript]
    H3{Active workflow available?}
    H4[Run workflow step and update workflow session]
    H5[Search knowledge base and reply cache]
    H6[Generate AI response]
    H7[Send reply to customer channel]
    H8{Issue resolved by AI or workflow?}
    H9[Mark conversation resolved]
    H10[Escalate to human operator]
  end

  subgraph OperatorWork[Human support operations]
    O1[Operator views inbox or AI voice inbox]
    O2[Review contact panel, transcript, insights, and customer memory]
    O3[Assign conversation owner]
    O4[Use saved reply or write manual response]
    O5[Update status as unresolved, escalated, or resolved]
    O6[Export transcript when needed]
  end

  subgraph Intelligence[Analytics and follow-up]
    A1[Analyze intent, sentiment, urgency, resolution, and response time]
    A2[Create or update conversation insight]
    A3[Update customer memory]
    A4[Update analytics dashboard]
    A5[Dispatch configured webhook events]
    A6[Record webhook delivery result]
  end

  Start --> S1 --> S2 --> S3 --> S4 --> S5 --> S6 --> S7 --> S8 --> S9
  S9 --> C1
  C1 --> C2
  C2 -->|Web widget| C3
  C2 -->|Voice| C4
  C2 -->|External channel| C5
  C3 --> C6
  C4 --> C6
  C5 --> C6

  C6 --> H1 --> H2 --> H3
  H3 -->|Yes| H4 --> H8
  H3 -->|No| H5 --> H6 --> H7 --> H8
  H8 -->|Yes| H9
  H8 -->|No or requested| H10

  H10 --> O1 --> O2 --> O3 --> O4 --> O5
  O5 -->|Needs more information| H2
  O5 -->|Resolved| H9
  O5 --> O6

  H9 --> A1
  H10 --> A1
  O6 --> A1
  A1 --> A2 --> A3 --> A4 --> A5 --> A6 --> End
```
