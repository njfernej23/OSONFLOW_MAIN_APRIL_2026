"use client";

import {
    type LucideIcon,
    BookOpenIcon,
    BotIcon,
    GemIcon,
    MicIcon,
    PaletteIcon,
    PhoneIcon,
    UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@workspace/ui/components/card";

interface Feature {
    icon: LucideIcon;
    label: string;
    description: string;
}

interface PremiumFeatureOverlayProps {
    children: React.ReactNode;
}

const features: Feature[] = [
    {
        icon: UsersIcon,
        label: "Team Collaboration",
        description: "Work together with your team",
    },
    {
        icon: BotIcon,
        label: "AI Assistant",
        description: "Get help from AI",
    },
    {
        icon: PhoneIcon,
        label: "Priority Support",
        description: "24/7 dedicated support",
    },
];

export const PremiumFeatureOverlay = ({
    children,
}: PremiumFeatureOverlayProps) => {
    const router = useRouter();

    return (
        <div className="relative h-screen w-full overflow-hidden">
            {/* Blurred background content */}
            <div className="pointer-events-none h-full select-none overflow-auto blur-[2px]">
                {children}
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[2px]" />

            {/* Upgrade prompt */}
            <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex items-center justify-center">
                            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
                                <GemIcon className="size-6 text-muted-foreground" />
                            </div>
                        </div>
                        <CardTitle className="text-xl">Premium Feature</CardTitle>
                        <CardDescription>
                            This feature requires a Pro subscription
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Features List */}
                        <div className="space-y-6">
                            {features.map((feature) => (
                                <div key={feature.label} className="flex items-center gap-3">
                                    <div className="flex size-8 items-center justify-center rounded-lg border bg-muted">
                                        <feature.icon className="size-4 text-muted-foreground" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-sm">{feature.label}</p>
                                        <p className="text-muted-foreground text-xs">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            className="w-full"
                            onClick={() => router.push("/billing")}
                            size="lg"
                        >
                            Upgrade to Pro
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};