import { ArrowLeftIcon, MicIcon, MicOffIcon, SparklesIcon } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
    AIConversation,
    AIConversationContent,
    AIConversationScrollButton,
} from "@workspace/ui/components/ai/conversation";
import {
    AIMessage,
    AIMessageContent,
} from "@workspace/ui/components/ai/message";
import { useVapi } from "@/modules/widget/hooks/use-vapi";
import { useOpenAIRealtime } from "@/modules/widget/hooks/use-openai-realtime";
import { useGeminiLive } from "@/modules/widget/hooks/use-gemini-live";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { useAtomValue, useSetAtom } from "jotai";
import { activeVoiceProviderAtom, screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { cn } from "@workspace/ui/lib/utils";
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization";


const VoiceCallUI = ({
    isConnected,
    isConnecting,
    isSpeaking,
    transcript,
    startCall,
    endCall,
    error,
}: {
    isConnected: boolean;
    isConnecting: boolean;
    isSpeaking: boolean;
    transcript: { role: "user" | "assistant"; text: string }[];
    startCall: () => void;
    endCall: () => void;
    error?: string | null;
}) => (
    <>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted))/0.45)]">
            <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
                {transcript.length > 0 ? (
                    <AIConversation className="h-full min-h-0 rounded-2xl border bg-background/85 shadow-sm backdrop-blur">
                        <AIConversationContent>
                            {transcript.map((message, index) => (
                                <AIMessage
                                    from={message.role}
                                    key={`${message.role}-${index}-${message.text}`}
                                >
                                    <AIMessageContent>{message.text}</AIMessageContent>
                                </AIMessage>
                            ))}
                        </AIConversationContent>
                        <AIConversationScrollButton />
                    </AIConversation>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed bg-background/70 p-5 text-center backdrop-blur">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                            <SparklesIcon className="size-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No transcript yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">Press start and allow microphone access.</p>
                    </div>
                )}
            </div>
        </div>

        <div className="relative z-10 shrink-0 border-t bg-background/95 p-4 backdrop-blur">
            <div className="flex flex-col items-center gap-y-4">
                {error && (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-center text-xs text-destructive">
                        {error}
                    </p>
                )}
                {isConnected && (
                    <div className="flex items-center gap-x-2">
                        <div
                            className={cn(
                                "size-4 rounded-full",
                                isSpeaking ? "animate-pulse bg-red-500" : "bg-green-500"
                            )}
                        />
                        <span className="text-muted-foreground text-sm">
                            {isSpeaking ? "Assistant Speaking..." : "Listening..."}
                        </span>
                    </div>
                )}
                <div className="flex w-full justify-center">
                    {isConnected ? (
                        <Button
                            className="w-full"
                            size="lg"
                            variant="destructive"
                            onClick={endCall}
                        >
                            <MicOffIcon />
                            End call
                        </Button>
                    ) : (
                        <Button
                            className="w-full"
                            disabled={isConnecting}
                            size="lg"
                            onClick={startCall}
                        >
                            <MicIcon />
                            {isConnecting ? "Connecting..." : "Start call"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    </>
);

const VapiVoice = () => {
    const { isConnected, isSpeaking, transcript, startCall, endCall, isConnecting } = useVapi();
    return <VoiceCallUI {...{ isConnected, isConnecting, isSpeaking, transcript, startCall, endCall }} />;
};

const OpenAIRealtimeVoice = () => {
    const { isConnected, isSpeaking, transcript, startCall, endCall, isConnecting, error } = useOpenAIRealtime();
    return <VoiceCallUI {...{ isConnected, isConnecting, isSpeaking, transcript, startCall, endCall, error }} />;
};

const GeminiLiveVoice = () => {
    const { isConnected, isSpeaking, transcript, startCall, endCall, isConnecting, error } = useGeminiLive();
    return <VoiceCallUI {...{ isConnected, isConnecting, isSpeaking, transcript, startCall, endCall, error }} />;
};


export const WidgetVoiceScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const widgetSettings = useAtomValue(widgetSettingsAtom);
    const activeVoiceProvider = useAtomValue(activeVoiceProviderAtom);
    const theme = mergeWidgetTheme(widgetSettings?.theme);
    const provider = activeVoiceProvider ?? "openai";

    return (
        <>
            <WidgetHeader className="relative z-10 shrink-0">
                <div className="flex items-center gap-x-2">
                    <Button
                        variant="transparent"
                        size="icon"
                        onClick={() => setScreen("selection")}
                    >
                        <ArrowLeftIcon />
                    </Button>
                    {theme.logoUrl ? (
                        <img
                            alt="Assistant logo"
                            className="size-6 rounded-md bg-white/90 object-cover p-1"
                            src={theme.logoUrl}
                        />
                    ) : null}
                    <p>{theme.assistantName} Voice</p>
                </div>
            </WidgetHeader>

            {provider === "vapi" ? (
                <VapiVoice />
            ) : provider === "gemini" ? (
                <GeminiLiveVoice />
            ) : (
                <OpenAIRealtimeVoice />
            )}
        </>
    );
};
