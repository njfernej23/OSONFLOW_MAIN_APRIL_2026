export function serializeSecretValue(value: Record<string, unknown>): string {
    return JSON.stringify(value);
}

export function parseSecretValue<T = Record<string, unknown>>(value: string): T | null {
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}
