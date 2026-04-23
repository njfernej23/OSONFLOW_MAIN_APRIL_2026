"use client"
import { useAction, useMutation, useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { LoaderIcon } from "lucide-react";
import {
    errorMessageAtom,
    loadingMessageAtom,
    screenAtom,
    organizationIdAtom,
    contactSessionIdAtomFamily,
    widgetSettingsAtom,
    vapiSecretsAtom,
} from "@/modules/widget/atoms/widget-atoms";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";
import { useState, useEffect } from "react";
import { api } from "@workspace/backend/_generated/api";
import { mergeWidgetAppearance } from "@workspace/ui/lib/widget-customization";

type InitStep = "org" | "session" | "settings" | "voice" | "done";


export const WidgetLoadingScreen = ({ organizationId }: { organizationId: string | null }) => {
    const [step, setStep] = useState<InitStep>('org');
    const setWidgetSettings = useSetAtom(widgetSettingsAtom);
    const [sessionValid, setSessionValid] = useState(false);
    const loadingMessage = useAtomValue(loadingMessageAtom);
    const setLoadingMessage = useSetAtom(loadingMessageAtom);
    const setErrorMessage = useSetAtom(errorMessageAtom);
    const setOrganizationId = useSetAtom(organizationIdAtom);
    const setVapiSecrets = useSetAtom(vapiSecretsAtom);

    const validateOrganization = useAction(api.public.organizations.validate);
    const setScreen = useSetAtom(screenAtom);

    const contactSessionId = useAtomValue(contactSessionIdAtomFamily(organizationId || ""));

    // Step 1: validate organization
    useEffect(() => {
        if (step != "org") return;
        setLoadingMessage("Finding organization ID...");

        if (!organizationId) {
            setErrorMessage("Organization ID is required");
            setScreen("error");
            return;
        }
        setLoadingMessage("Verifying organization...");
        validateOrganization({ organizationId })
            .then((result) => {
                if (result.valid) {
                    setOrganizationId(organizationId);
                    setStep("session");
                } else {
                    setErrorMessage(result.reason || "Invalid configuration");
                    setScreen("error");
                }
            })
            .catch(() => {
                setErrorMessage("Failed to validate organization");
                setScreen("error");
            });
    }, [step, organizationId, setScreen, setErrorMessage, setLoadingMessage, setOrganizationId, validateOrganization, setStep]);

    // Step 2: validate session if it exists
    const validateContactSession = useMutation(api.public.contactSessions.validate);
    useEffect(() => {
        if (step !== "session") return;
        setLoadingMessage("Finding contact session ID...");
        if (!contactSessionId) {
            setSessionValid(false);
            setStep("settings");
            return;
        }
        setLoadingMessage("Validating Session... ");
        validateContactSession({ organizationId: organizationId!, contactSessionId })
            .then((result) => {
                setSessionValid(result.valid);
                setStep("settings");
            })
            .catch(() => {
                setSessionValid(false);
                setStep("settings");
            });
    }, [step, contactSessionId, validateContactSession, setLoadingMessage]);

    // Step 3: load widget settings
    const widgetSettings = useQuery(
        api.public.widgetSettings.getByOrganizationId,
        organizationId ? { organizationId } : "skip",
    );

    useEffect(() => {
        if (step !== "settings") return;
        setLoadingMessage("Loading widget settings...");
        if (widgetSettings !== undefined) {
            setWidgetSettings(widgetSettings);
            setStep("voice");
        }
    }, [step, widgetSettings, setStep, setWidgetSettings, setLoadingMessage]);

    const appearance = mergeWidgetAppearance(widgetSettings?.appearance);
    if (typeof window !== "undefined" && window.parent !== window) {
        window.parent.postMessage(
            { type: "widget-settings", payload: { appearance } },
            "*"
        );
    }

    // Step 4: load voice config
    const getVapiSecrets = useAction(api.public.secrets.getVapiSecrets);

    useEffect(() => {
        if (step !== "voice") return;
        if (!organizationId) {
            setErrorMessage("Organization ID is required");
            setScreen("error");
            return;
        }

        setLoadingMessage("Loading voice features...");

        getVapiSecrets({ organizationId })
            .catch(() => null)
            .then((vapiSecrets) => {
                setVapiSecrets(vapiSecrets);
                setStep("done");
            });
    }, [
        step,
        organizationId,
        getVapiSecrets,
        setVapiSecrets,
        setLoadingMessage,
        setStep,
        setErrorMessage,
        setScreen,
    ]);

    // Step 5: navigate
    useEffect(() => {
        if (step !== "done") return;
        const hasValidSession = contactSessionId && sessionValid;
        setScreen(hasValidSession ? "selection" : "auth");
    }, [step, contactSessionId, sessionValid, setScreen]);

    return (
        <>
            <WidgetHeader className="widget-error-header">
                <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold">
                    <p className="text-3xl">Hi there 👋</p>
                    <p className="text-lg">Let&apos;s get you started</p>
                </div>
            </WidgetHeader>
            <div className="flex flex-1 flex-col items-center justify-center gap-y-4 p-4 text-muted-foreground">
                <LoaderIcon className="animate-spin" />
                <p className="text-sm">{loadingMessage || "Loading..."}</p>
            </div>
        </>
    );
};
