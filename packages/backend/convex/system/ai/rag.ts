import { openai } from "@ai-sdk/openai";
import { RAG } from "@convex-dev/rag";
import { components } from "../../_generated/api";
import {
  OPENAI_EMBEDDING_MODEL,
  getOpenAIEmbeddingModelFromSecretValue,
} from "../../lib/openai";

const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding(OPENAI_EMBEDDING_MODEL),
  embeddingDimension: 1536,
});

export const getRagForOrganization = async (
  secretValue?: string | null
): Promise<RAG> =>
  new RAG(components.rag, {
    textEmbeddingModel: getOpenAIEmbeddingModelFromSecretValue(secretValue),
    embeddingDimension: 1536,
  });

export default rag;
