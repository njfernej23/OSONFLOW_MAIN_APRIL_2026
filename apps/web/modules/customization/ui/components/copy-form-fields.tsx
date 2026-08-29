"use client"

import { UseFormReturn } from "react-hook-form"
import { HomeIcon, MessageCircleIcon, TypeIcon } from "lucide-react"

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/form"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import { FormSchema } from "../../types"
import {
  SettingsDivider,
  SettingsGroup,
} from "./settings-primitives"

interface CopyFormFieldsProps {
  form: UseFormReturn<FormSchema>
}

const suggestionFields = [
  {
    name: "defaultSuggestions.suggestion1" as const,
    placeholder: "How do I get started?",
  },
  {
    name: "defaultSuggestions.suggestion2" as const,
    placeholder: "What are your pricing plans?",
  },
  {
    name: "defaultSuggestions.suggestion3" as const,
    placeholder: "I need help with my account",
  },
]

/** A labelled text field with a live character budget. */
const CopyField = ({
  form,
  name,
  label,
  description,
  placeholder,
  limit,
}: {
  form: UseFormReturn<FormSchema>
  name:
    | "widgetCopy.homeGreeting"
    | "widgetCopy.homeHeadline"
    | "widgetCopy.startChatLabel"
    | "widgetCopy.inputPlaceholder"
    | "widgetCopy.onlineLabel"
  label: string
  description: string
  placeholder: string
  limit: number
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => {
      const length = field.value?.length ?? 0

      return (
        <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium text-foreground">{label}</span>
            <span
              className={cn(
                "console-numeral text-[10px]",
                length > limit
                  ? "console-tone-critical"
                  : "text-muted-foreground/70"
              )}
            >
              {length}/{limit}
            </span>
          </div>
          <FormControl>
            <Input
              {...field}
              className="mt-2.5 h-9 bg-background"
              placeholder={placeholder}
            />
          </FormControl>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
          <FormMessage className="mt-1.5" />
        </FormItem>
      )
    }}
  />
)

export const CopyFormFields = ({ form }: CopyFormFieldsProps) => {
  const copy = form.watch("widgetCopy")
  const theme = form.watch("theme")
  const greetMessage = form.watch("greetMessage")
  const greetLength = greetMessage?.length ?? 0

  return (
    <div className="min-w-0">
      <SettingsGroup
        description="The two lines a visitor reads before they do anything else, shown over your home background."
        icon={HomeIcon}
        title="Home screen"
      >
        <div
          aria-hidden
          className="overflow-hidden rounded-[var(--console-radius)] border border-[var(--console-hairline-soft)] px-5 py-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${theme.headerGradientStart}, ${theme.headerGradientEnd})`,
          }}
        >
          <p className="text-lg font-bold tracking-tight text-white/70">
            {copy.homeGreeting || "Hi there 👋"}
          </p>
          <p className="mt-1 max-w-[18rem] text-2xl leading-[1.1] font-extrabold tracking-tight">
            {copy.homeHeadline || "Let me know how we can help!"}
          </p>
          <span className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-900">
            {copy.startChatLabel || "Start a chat"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CopyField
            description="The small line above the headline."
            form={form}
            label="Greeting"
            limit={60}
            name="widgetCopy.homeGreeting"
            placeholder="Hi there 👋"
          />
          <CopyField
            description="The large headline. Keep it to one short sentence."
            form={form}
            label="Headline"
            limit={90}
            name="widgetCopy.homeHeadline"
          placeholder="Let me know how we can help!"
          />
          <CopyField
            description="Label on the button that starts a new conversation."
            form={form}
            label="Start chat button"
            limit={40}
            name="widgetCopy.startChatLabel"
            placeholder="Start a chat"
          />
          <CopyField
            description="Shown next to the live dot in the chat header."
            form={form}
            label="Availability label"
            limit={40}
            name="widgetCopy.onlineLabel"
            placeholder="Online · replies instantly"
          />
        </div>
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="What the assistant opens with, and the chips offered before the visitor types."
        icon={MessageCircleIcon}
        title="Conversation opener"
      >
        <FormField
          control={form.control}
          name="greetMessage"
          render={({ field }) => (
            <FormItem className="console-inset min-w-0 space-y-0 px-3.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-foreground">
                  Greeting message
                </span>
                <span
                  className={cn(
                    "console-numeral text-[10px]",
                    greetLength > 300
                      ? "console-tone-critical"
                      : "text-muted-foreground/70"
                  )}
                >
                  {greetLength}/300
                </span>
              </div>
              <FormControl>
                <Textarea
                  {...field}
                  className="mt-2.5 resize-none bg-background"
                  placeholder="Welcome message shown when chat opens"
                  rows={3}
                />
              </FormControl>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                The first message in every new conversation.
              </p>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />

        <div className="console-inset px-3.5 py-3">
          <p className="text-xs font-medium text-foreground">
            Suggested first messages
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Up to three chips shown under the greeting. Leave one empty to hide
            it.
          </p>
          <div className="mt-3 grid gap-2">
            {suggestionFields.map((suggestionField, index) => (
              <FormField
                control={form.control}
                key={suggestionField.name}
                name={suggestionField.name}
                render={({ field }) => (
                  <FormItem className="min-w-0 space-y-0">
                    <div className="flex items-center gap-2.5 rounded-[10px] border border-[var(--console-hairline-soft)] bg-background px-3 py-1.5">
                      <span className="console-numeral flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
                        {index + 1}
                      </span>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                          placeholder={suggestionField.placeholder}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <span className="console-numeral w-9 shrink-0 text-right text-[10px] text-muted-foreground/60">
                        {field.value?.length ?? 0}/80
                      </span>
                    </div>
                    <FormMessage className="mt-1.5" />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>
      </SettingsGroup>

      <SettingsDivider />

      <SettingsGroup
        description="Interface strings the visitor sees while typing."
        icon={TypeIcon}
        title="Composer"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <CopyField
            description="Placeholder inside the message box."
            form={form}
            label="Input placeholder"
            limit={60}
            name="widgetCopy.inputPlaceholder"
            placeholder="Type your message…"
          />
        </div>
      </SettingsGroup>
    </div>
  )
}
