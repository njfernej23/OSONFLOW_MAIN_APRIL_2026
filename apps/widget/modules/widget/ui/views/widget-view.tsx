"use client"
import { useAtomValue, useSetAtom } from "jotai"
import {
  screenAtom,
  widgetModeAtom,
  widgetSettingsAtom,
} from "@/modules/widget/atoms/widget-atoms"
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen"
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen"
import { WidgetLoadingScreen } from "../screens/widget-loading-screen"
import { WidgetSelectionScreen } from "../screens/widget-selection-screen"
import { WidgetChatScreen } from "../screens/widget-chat-screen"
import { WidgetInboxScreen } from "../screens/widget-inbox-screen"
import { WidgetVoiceScreen } from "../screens/widget-voice-screen"
import { WidgetContactScreen } from "../screens/widget-contact-screen"
import { WidgetHelpScreen } from "../screens/widget-help-screen"
import { WidgetArticleScreen } from "../screens/widget-article-screen"
import { WidgetTopicScreen } from "../screens/widget-topic-screen"
import {
  getContrastingTextColor,
  mergeWidgetTheme,
} from "@workspace/ui/lib/widget-customization"
import { CSSProperties, useEffect } from "react"
import type { WidgetMode } from "../../atoms/widget-atoms"

interface Props {
  organizationId: string | null
  mode?: WidgetMode
  parentPageUrl?: string
}

export const WidgetView = ({
  mode = "standard",
  organizationId,
  parentPageUrl,
}: Props) => {
  const screen = useAtomValue(screenAtom)
  const widgetMode = useAtomValue(widgetModeAtom)
  const setWidgetMode = useSetAtom(widgetModeAtom)
  const widgetSettings = useAtomValue(widgetSettingsAtom)
  const theme = mergeWidgetTheme(widgetSettings?.theme)
  const primaryForeground = getContrastingTextColor(theme.primaryColor)
  const widgetStyles = {
    "--widget-header-start": theme.headerGradientStart,
    "--widget-header-end": theme.headerGradientEnd,
    "--widget-user-bubble": theme.userBubbleColor,
    "--widget-user-bubble-foreground": getContrastingTextColor(
      theme.userBubbleColor
    ),
    "--widget-bot-bubble": theme.botBubbleColor,
    "--widget-bot-bubble-foreground": getContrastingTextColor(
      theme.botBubbleColor,
      "#111111"
    ),
    "--primary": theme.primaryColor,
    "--primary-foreground": primaryForeground,
  } as CSSProperties

  useEffect(() => {
    setWidgetMode(mode)
  }, [mode, setWidgetMode])

  const screenComponents = {
    loading: (
      <WidgetLoadingScreen
        mode={mode}
        organizationId={organizationId}
        parentPageUrl={parentPageUrl}
      />
    ),
    auth: <WidgetAuthScreen />,
    selection: <WidgetSelectionScreen />,
    help: <WidgetHelpScreen />,
    topic: <WidgetTopicScreen />,
    article: <WidgetArticleScreen />,
    error: <WidgetErrorScreen />,
    chat: <WidgetChatScreen />,
    voice: <WidgetVoiceScreen mode={widgetMode} />,
    inbox: <WidgetInboxScreen />,
    contact: <WidgetContactScreen />,
  }

  return (
    <main
      className="surface-widget relative flex h-full max-h-svh min-h-0 w-full min-w-0 flex-col overflow-hidden border-0 bg-transparent"
      style={{
        ...widgetStyles,
        borderRadius: `${theme.borderRadius}px`,
      }}
    >
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {screenComponents[screen]}
      </div>
    </main>
  )
}
