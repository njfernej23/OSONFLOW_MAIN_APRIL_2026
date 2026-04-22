import {
    DEFAULT_WIDGET_SCRIPT_URL,
    type IntegrationId,
    INTEGRATION_SNIPPET_BUILDERS,
    type IntegrationSnippetOptions,
} from "./constants";

export const normalizeScriptUrl = (scriptUrl: string) => {
    const trimmedValue = scriptUrl.trim();
    return trimmedValue.length > 0 ? trimmedValue : DEFAULT_WIDGET_SCRIPT_URL;
};

export const isValidWidgetScriptUrl = (scriptUrl: string) => {
    try {
        const parsedUrl = new URL(scriptUrl);
        return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    } catch {
        return false;
    }
};

export const createScript = (
    integrationId: IntegrationId,
    options: IntegrationSnippetOptions,
) => {
    const builder = INTEGRATION_SNIPPET_BUILDERS[integrationId];
    return builder({
        ...options,
        scriptUrl: normalizeScriptUrl(options.scriptUrl),
    });
};