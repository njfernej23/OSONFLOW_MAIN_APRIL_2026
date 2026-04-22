"use client";

import { useOrganization } from "@clerk/nextjs";
import {AuthLayout} from "@/modules/auth/ui/layouts/auth-layout";
import { OrgSelectView } from "@/modules/auth/ui/views/org-select-view";

export const OrganizationGuard = ({children}: {children: React.ReactNode}) => {
    const { organization, isLoaded } = useOrganization();

    // Wait for Clerk to load before rendering anything
    if (!isLoaded) {
        return null;
    }

    if (!organization) {
        return (
            <AuthLayout>
               <OrgSelectView />
            </AuthLayout>
        );
    }

    return(
        <>
            {children}
        </>
    )


}