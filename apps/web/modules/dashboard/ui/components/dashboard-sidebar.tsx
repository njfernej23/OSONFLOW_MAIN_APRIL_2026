"use client"

import {OrganizationSwitcher, Show, UserButton} from "@clerk/nextjs";

import {
    CreditCardIcon,
    InboxIcon,
    LayoutDashboardIcon,
    LibraryBigIcon,
    SparklesIcon,
    PaletteIcon,
} from "lucide-react";

import Image from "next/image";
import Link from "next/link";

import {usePathname} from "next/navigation";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@workspace/ui/components/sidebar"

import {cn} from "@workspace/ui/lib/utils"

const customerSupportItems = [
    {
        title: "Conversations",
        url: "/conversations",
        icon: InboxIcon,

    },
    {
        title: "AI Conversations",
        url: "/ai-conversations",
        icon: SparklesIcon,
        adminOnly: true,
    },

    {
        title: "Knowledge Base",
        url: "/files",
        icon: LibraryBigIcon,
    },
];
const configurationItems = [
    {
        title: "Widget Customization",
        url: "/customization",
        icon: PaletteIcon,
    },
    {
        title: "Integrations",
        url: "/integrations",
        icon: LayoutDashboardIcon,
    },
    {
        title: "Vapi Voice",
        url: "/plugins/vapi",
        icon: null, // Will use custom image
        customIcon: "/vapi.jpg",
    },
];

const accountsItem = [
    {
        title: "Plans & Billing",
        url: "/billing",
        icon: CreditCardIcon,

    },
];


export const DashboardSidebar = () => {
    const pathname = usePathname();

    const isActive = (url: string) => {
        if (url === "/"){
            return pathname === "/";
        }
        return pathname.startsWith(url);
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild size="lg">
                            <OrganizationSwitcher 
                                hidePersonal 
                                skipInvitationScreen
                                appearance={{
                                    elements:{
                                        rootBox: "w-full! h-8!",
                                        avatarBox :"size-4! rounded-sm!",
                                        organizationSwitcherTrigger: "w-full! justify-start! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                                        organizationPreview:"group-data-[collapsible=icon]:justify-center! gap-2!",
                                        organizationPreviewTextContainer: "group-data-[collapsible=icon]:hidden! text-xs! font-medium! text-sidebar-foreground!",
                                        organizationSwitcherTriggerIcon:"group-data-[collapsible=icon]:hidden! ml-auto! text-sidebar-foreground!"
                                    }
                                }}
                            />
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Customer Support */}
                <SidebarGroup>
                    <SidebarGroupLabel>Customer Support</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {customerSupportItems.map((item) => (
                                item.adminOnly ? (
                                    <Show key={item.title} when={{ role: "admin" }}>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)} className={cn(
                                                isActive(item.url) && "bg-sidebar-primary! text-sidebar-primary-foreground!"
                                            )}>
                                                <Link href={item.url}>
                                                    <item.icon  className="size-4"/>
                                                    <span>{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </Show>
                                ) : (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)} className={cn(
                                            isActive(item.url) && "bg-sidebar-primary! text-sidebar-primary-foreground!"
                                        )}>
                                            <Link href={item.url}>
                                                <item.icon  className="size-4"/>
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>


                {/* Configuration */}
                <SidebarGroup>
                    <SidebarGroupLabel>Configuration</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {configurationItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)} className={cn(
                                        isActive(item.url) && "bg-sidebar-primary! text-sidebar-primary-foreground!"
                                    )}>
                                        <Link href={item.url}>
                                            {item.customIcon ? (
                                                <Image 
                                                    src={item.customIcon} 
                                                    alt={item.title}
                                                    width={16}
                                                    height={16}
                                                    className="size-4 rounded-sm object-cover"
                                                />
                                            ) : item.icon ? (
                                                <item.icon className="size-4"/>
                                            ) : null}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>


                {/* Billing */}
                <SidebarGroup>
                    <SidebarGroupLabel>Billing</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {accountsItem.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(item.url)} className={cn(
                                        isActive(item.url) && "bg-sidebar-primary! text-sidebar-primary-foreground!"
                                    )}>
                                        <Link href={item.url}>
                                            <item.icon  className="size-4"/>
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
                
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <UserButton 
                        showName
                        appearance={
                            {
                                elements: {
                                    rootBox: "w-full! h-8!",
                                    userButtonTrigger: "w-full! p-2! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!",
                                    userButtonBox: "w-full! flex-row-reverse! justify-end! gap-2! group-data-[collapsible=icon]:justify-center! text-sidebar-foreground!",
                                    userButtonOuterIdentifier: "pl-0! group-data-[collapsible=icon]:hidden!",
                                    avatarBox: "size-4!"
                                }
                            }
                        }
                        />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
