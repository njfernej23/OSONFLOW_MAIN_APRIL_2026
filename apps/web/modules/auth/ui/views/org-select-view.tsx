import {OrganizationList} from "@clerk/nextjs";
export const OrgSelectView = () => {
    return (
        <OrganizationList
            afterCreateOrganizationUrl="/organization-created"
            afterSelectOrganizationUrl="/analytics"
            hidePersonal
            skipInvitationScreen
        />
    );
}
