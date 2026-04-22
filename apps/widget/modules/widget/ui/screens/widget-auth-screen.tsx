import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { WidgetHeader } from "@/modules/widget/ui/components/widget-header"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@workspace/ui/components/form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api"
import { Doc } from "@workspace/backend/_generated/dataModel";
import { contactSessionIdAtomFamily, organizationIdAtom, screenAtom, widgetSettingsAtom } from "../../atoms/widget-atoms";
import { useSetAtom, useAtomValue } from "jotai";
import { mergeWidgetTheme } from "@workspace/ui/lib/widget-customization";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),

});

export const WidgetAuthScreen = () => {
    const setScreen = useSetAtom(screenAtom);
    const organizationId = useAtomValue(organizationIdAtom);
    const widgetSettings = useAtomValue(widgetSettingsAtom);
    const theme = mergeWidgetTheme(widgetSettings?.theme);
    const setContactSessionsId = useSetAtom(contactSessionIdAtomFamily(organizationId || ""))
    const createContactSession = useMutation(api.public.contactSessions.create);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
        },
    });



    const onSubmit = async (values: z.infer<typeof formSchema>) => {

        if (!organizationId) {
            return;
        }
        const metadata: Doc<"contactSessions">["metadata"] = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            languages: navigator.languages?.join(","),
            platform: navigator.platform,
            vendor: navigator.vendor,
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            cookieEnabled: navigator.cookieEnabled,
            referrer: document.referrer || "direct",
            currentUrl: window.location.href,

        };

        const contactSessionId = await createContactSession({
            ...values,
            organizationId,
            metadata,
        });

        setContactSessionsId(contactSessionId);
        setScreen('selection');
    };


    return (
        <>
            <WidgetHeader className="">
                <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semibold">
                    {theme.logoUrl ? (
                        <img
                            alt="Assistant logo"
                            className="mb-2 h-8 w-8 rounded-md bg-white/90 object-cover p-1"
                            src={theme.logoUrl}
                        />
                    ) : null}
                    <p className="text-3xl">Hi there 👋</p>
                    <p className="text-lg">
                        You&apos;re talking to {theme.assistantName}
                    </p>
                </div>
            </WidgetHeader>
            <Form {...form}>
                <form className="flex flex-1 flex-col gap-y-4 p-4"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        className="h-10 bg-background"
                                        placeholder="zyzz mukh"
                                        type="text"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        className="h-10 bg-background"
                                        placeholder="your@email.com"
                                        type="email"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="mt-auto">
                        Get Started
                    </Button>
                </form>

            </Form >
        </>
    )
}
