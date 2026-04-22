
"use client"
import { Button } from "@workspace/ui/components/button"
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { MessageSquareTextIcon, ChevronRightIcon, MicIcon, PhoneIcon } from "lucide-react";
import { contactSessionIdAtomFamily, conversationIdAtom, errorMessageAtom, hasVapiSecretsAtom, organizationIdAtom, screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";

import { useAtomValue, useSetAtom } from "jotai";
import { api } from "@workspace/backend/_generated/api";
import { useMutation } from "convex/react";
import { useState } from "react"
import { WidgetFooter } from "../components/widget-footer";
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization";


export const WidgetSelectionScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const setErrorMessage = useSetAtom(errorMessageAtom);
    const setConversationId = useSetAtom(conversationIdAtom);
    const widgetSettings = useAtomValue(widgetSettingsAtom)
    const theme = mergeWidgetTheme(widgetSettings?.theme)
    const hasVapiSecrets = useAtomValue(hasVapiSecretsAtom)
    const organizationId = useAtomValue(organizationIdAtom);
    const contactSessionId = useAtomValue(contactSessionIdAtomFamily(organizationId || ""))


    const createConversation = useMutation(api.public.conversations.create);
    const [isPending, setIsPending] = useState(false);


    const handleNewConversation = async () => {

        if (!organizationId) {
            setScreen("error");
            setErrorMessage("Missing Organization ID");
            return;
        }
        if (!contactSessionId) {
            setScreen("auth");
            return;
        }
        setIsPending(true);
        try {
            const conversationId = await createConversation({
                contactSessionId,
                organizationId,
            });
            setConversationId(conversationId);
            setScreen("chat");
        } catch {
            setScreen("auth")
        } finally {
            setIsPending(false);
        }
    }

    return (
        <>
            <WidgetHeader className="widget-error-header">
                <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold">
                    {theme.logoUrl ? (
                        <img
                            alt="Assistant logo"
                            className="mb-2 h-8 w-8 rounded-md bg-white/90 object-cover p-1"
                            src={theme.logoUrl}
                        />
                    ) : null}
                    <p className="text-3xl">Hi there 👋</p>
                    <p className="text-lg">Talk to {theme.assistantName}</p>
                </div>
            </WidgetHeader>
            <div className="flex flex-1 flex-col gap-y-4 p-4 overflow-y-auto">

                <Button className="h-16 w-full justify-between"
                    variant="outline"
                    onClick={handleNewConversation}
                    disabled={isPending}
                >
                    <div className="flex items-center gap-x-2">
                        <MessageSquareTextIcon className="size-4" />
                        <span>Start Chat</span>
                    </div>

                    <ChevronRightIcon />
                </Button>
                {hasVapiSecrets && widgetSettings?.vapiSettings?.assistantId && (
                    <Button
                        className="h-16 w-full justify-between"
                        variant="outline"
                        onClick={() => setScreen("voice")}
                        disabled={isPending}
                    >
                        <div className="flex items-center gap-x-2">
                            <MicIcon className="size-4" />
                            <span>Start voice call</span>
                        </div>
                        <ChevronRightIcon />
                    </Button>
                )}

                {hasVapiSecrets && widgetSettings?.vapiSettings?.phoneNumber && (
                    <Button
                        className="h-16 w-full justify-between"
                        variant="outline"
                        onClick={() => setScreen("contact")}
                        disabled={isPending}
                    >
                        <div className="flex items-center gap-x-2">
                            <PhoneIcon className="size-4" />
                            <span>Call us</span>
                        </div>
                        <ChevronRightIcon />
                    </Button>
                )}
            </div>

            <WidgetFooter />
        </>
    )
}