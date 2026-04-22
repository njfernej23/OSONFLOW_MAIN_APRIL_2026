import { Hint } from '@workspace/ui/components/hint';
import { Doc } from '@workspace/backend/_generated/dataModel';
import { Button } from '@workspace/ui/components/button';
import { ArrowRightIcon, ArrowUpIcon, CheckIcon } from 'lucide-react';

export const ConversationStatusButton = ({
    status,
    onClick,
    disabled,
}: {
    status: Doc<"conversations">["status"];
    onClick: () => void;
    disabled?: boolean;
}) => {
    if (status === "resolved") {
        return (
            <Hint text="Mark as unresolved">
                <Button
                    onClick={onClick}
                    size="sm"
                    variant="tertiary"
                    className="gap-1.5 text-emerald-700 dark:text-emerald-400"
                >
                    <CheckIcon className="size-3.5 text-emerald-600" />
                    Resolved
                </Button>
            </Hint>
        );
    }

    if (status === "escalated") {
        return (
            <Hint text="Mark as resolved">
                <Button
                    disabled={disabled}
                    onClick={onClick}
                    size="sm"
                    variant="warning"
                    className="gap-1.5"
                >
                    <ArrowUpIcon className="size-3.5" />
                    Escalated
                </Button>
            </Hint>
        );
    }

    return (
        <Hint text="Mark as escalated">
            <Button
                disabled={disabled}
                onClick={onClick}
                size="sm"
                variant="destructive"
                className="gap-1.5"
            >
                <ArrowRightIcon className="size-3.5" />
                Open
            </Button>
        </Hint>
    );
};
