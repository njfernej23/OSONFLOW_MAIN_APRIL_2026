import {OrganizationList} from "@clerk/nextjs";
export const OrgSelectView = () => {
    return (
        <OrganizationList
            afterCreateOrganizationUrl="/analytics"
            afterSelectOrganizationUrl="/analytics"
            hidePersonal
            skipInvitationScreen
        />
    );
}
