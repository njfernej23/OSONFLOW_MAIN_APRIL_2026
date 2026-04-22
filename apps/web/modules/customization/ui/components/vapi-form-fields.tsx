import { UseFormReturn } from "react-hook-form";

import { useVapiAssistants, useVapiPhoneNumbers } from "@/modules/plugins/hooks/use-vapi-data";
import {
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@workspace/ui/components/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select";
import { FormSchema } from "../../types";

interface VapiFormFieldsProps {
    form: UseFormReturn<FormSchema>;
    disabled?: boolean;
}

export const VapiFormFields = ({
    form,
    disabled,
}: VapiFormFieldsProps) => {
    const { data: assistants, isLoading: assistantsLoading } = useVapiAssistants();
    const { data: phoneNumbers, isLoading: phoneNumbersLoading } = useVapiPhoneNumbers();

    return (
        <>
            <FormField
                control={form.control}
                name="vapiSettings.assistantId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Voice Assistant</FormLabel>
                        <Select
                            disabled={assistantsLoading || disabled}
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            assistantsLoading
                                                ? "Loading assistants..."
                                                : "Select an assistant"
                                        }
                                    />
                                </SelectTrigger>
                            </FormControl>

                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {assistants.map((assistant: any) => (
                                    <SelectItem key={assistant.id} value={assistant.id}>
                                        {assistant.name || "Unnamed Assistant"} –{" "}
                                        {assistant.model?.model || "Unknown model"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            The Vapi assistant to use for voice calls
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="vapiSettings.phoneNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <Select
                            disabled={phoneNumbersLoading || disabled}
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={
                                            phoneNumbersLoading
                                                ? "Loading phone numbers..."
                                                : "Select a phone number"
                                        }
                                    />
                                </SelectTrigger>
                            </FormControl>

                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {phoneNumbers.map((phone: any) => (
                                    <SelectItem key={phone.id} value={phone.id}>
                                        {phone.number || "Unknown"} –{" "}
                                        {phone.name || "Unnamed"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Phone number to display in the widget
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </>
    );
};