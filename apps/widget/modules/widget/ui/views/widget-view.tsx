"use client"
import { useAtomValue } from "jotai";
import { screenAtom, widgetSettingsAtom } from "@/modules/widget/atoms/widget-atoms"
import { WidgetAuthScreen } from "@/modules/widget/ui/screens/widget-auth-screen";
import { JSX } from "react/jsx-dev-runtime";
import { WidgetErrorScreen } from "@/modules/widget/ui/screens/widget-error-screen";
import { WidgetLoadingScreen } from "../screens/widget-loading-screen";
import { WidgetSelectionScreen } from "../screens/widget-selection-screen";
import { WidgetChatScreen } from "../screens/widget-chat-screen";
import { WidgetInboxScreen } from "../screens/widget-inbox-screen";
import { WidgetVoiceScreen } from "../screens/widget-voice-screen";
import { WidgetContactScreen } from "../screens/widget-contact-screen";
import {
  getContrastingTextColor,
  mergeWidgetTheme,
} from "@workspace/ui/lib/widget-customization";
import { CSSProperties } from "react";


interface Props {
  organizationId: string | null;
}

export const WidgetView = ({ organizationId }: Props) => {
  const screen = useAtomValue(screenAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);
  const theme = mergeWidgetTheme(widgetSettings?.theme);
  const primaryForeground = getContrastingTextColor(theme.primaryColor);
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
  } as CSSProperties;

  const screenComponents = {
    loading: <WidgetLoadingScreen organizationId={organizationId} />,
    auth: <WidgetAuthScreen />,
    selection: <WidgetSelectionScreen />,
    error: <WidgetErrorScreen />,
    chat: <WidgetChatScreen />,
    voice: <WidgetVoiceScreen />,
    inbox: <WidgetInboxScreen />,
    contact: <WidgetContactScreen />,
  }




  return (
    <main
      className="flex h-full max-h-svh min-h-0 w-full min-w-0 flex-col overflow-hidden border bg-muted"
      style={{
        ...widgetStyles,
        borderRadius: `${theme.borderRadius}px`,
      }}
    >
      {screenComponents[screen]}
    </main>
  );
};
