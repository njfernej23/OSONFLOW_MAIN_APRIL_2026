import { createOpenAI, openai } from "@ai-sdk/openai"
import { parseSecretValue } from "./secrets"

type SecretApiKeyPayload = {
  apiKey?: string
}

export const OPENAI_CHAT_MODEL = "gpt-4o-mini"
export const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"

export const getOpenAIKeyFromSecretValue = (
  secretValue?: string | null
): string | null => {
  const secretPayload: SecretApiKeyPayload | null = secretValue
    ? parseSecretValue<SecretApiKeyPayload>(secretValue)
    : null

  return secretPayload?.apiKey?.trim() || null
}

export const getOpenAIProviderFromSecretValue = (
  secretValue?: string | null
) => {
  const apiKey = getOpenAIKeyFromSecretValue(secretValue)

  return apiKey ? createOpenAI({ apiKey }) : openai
}

export const getOpenAIChatModelFromSecretValue = (
  secretValue?: string | null,
  model = OPENAI_CHAT_MODEL
): any => {
  const provider = getOpenAIProviderFromSecretValue(secretValue)

  return provider.chat(model)
}

export const getOpenAIEmbeddingModelFromSecretValue = (
  secretValue?: string | null,
  model = OPENAI_EMBEDDING_MODEL
): any => {
  const provider = getOpenAIProviderFromSecretValue(secretValue)

  return provider.embedding(model)
}
