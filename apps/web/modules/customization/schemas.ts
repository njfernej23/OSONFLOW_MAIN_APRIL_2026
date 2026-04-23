import z from "zod";
import { HEX_COLOR_REGEX } from "@workspace/ui/lib/widget-customization";

const hexColorField = z
    .string()
    .regex(HEX_COLOR_REGEX, "Please provide a valid HEX color (e.g. #3b82f6)");

const imageUrlField = z
    .string()
    .trim()
    .refine(
        (value) =>
            value === "" ||
            value.startsWith("data:image/") ||
            z.string().url().safeParse(value).success,
        "Please provide a valid image URL"
    );

export const widgetSettingsSchema = z.object({
    greetMessage: z.string().min(1, "Greeting message is required"),
    systemPrompt: z
        .string()
        .trim()
        .min(1, "System prompt is required")
        .max(12000, "System prompt must be at most 12000 characters"),
    defaultSuggestions: z.object({
        suggestion1: z.string().optional(),
        suggestion2: z.string().optional(),
        suggestion3: z.string().optional(),
    }),
    vapiSettings: z.object({
        assistantId: z.string().optional(),
        phoneNumber: z.string().optional(),
    }),
    openaiRealtimeSettings: z.object({
        enabled: z.boolean().optional(),
        model: z.string().trim().min(1, "Model is required"),
        voice: z.string().trim().min(1, "Voice is required"),
    }),
    geminiLiveSettings: z.object({
        enabled: z.boolean().optional(),
        model: z.string().trim().min(1, "Model is required"),
        voice: z.string().trim().min(1, "Voice is required"),
    }),
    theme: z.object({
        primaryColor: hexColorField,
        headerGradientStart: hexColorField,
        headerGradientEnd: hexColorField,
        userBubbleColor: hexColorField,
        botBubbleColor: hexColorField,
        borderRadius: z.coerce.number().min(0).max(32),
        logoUrl: imageUrlField,
        assistantName: z
            .string()
            .trim()
            .min(1, "Assistant name is required")
            .max(40, "Assistant name must be at most 40 characters"),
    }),
    appearance: z.object({
        launcherColor: hexColorField,
        launcherLabel: z
            .string()
            .trim()
            .min(1, "Launcher label is required")
            .max(40, "Launcher label must be at most 40 characters"),
        launcherIcon: z.enum(["chat", "sparkles", "question"]),
        launcherIconUrl: imageUrlField,
        poweredByText: z
            .string()
            .trim()
            .min(1, "Powered by text is required")
            .max(40, "Powered by text must be at most 40 characters"),
        showPoweredBy: z.boolean(),
    }),
});
