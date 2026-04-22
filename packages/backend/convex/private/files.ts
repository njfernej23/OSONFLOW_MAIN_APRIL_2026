import { ConvexError, v } from "convex/values";
import { action, mutation, query, QueryCtx } from "../_generated/server";
import { contentHashFromArrayBuffer, Entry, EntryId, guessMimeTypeFromContents, guessMimeTypeFromExtension, vEntryId } from "@convex-dev/rag"
import { extractTextContent } from "../lib/extractTextContent";
import rag from "../system/ai/rag";
import { Id } from "../_generated/dataModel"
import { paginationOptsValidator } from "convex/server";
import { internal } from "../_generated/api";

function guessMimeType(filename: string, bytes: ArrayBuffer): string {
    return (
        guessMimeTypeFromExtension(filename) ||
        guessMimeTypeFromContents(bytes) ||
        "application/octet-stream"
    )
}

const SCRAPE_TIMEOUT_MS = 15_000;
const MAX_SCRAPED_HTML_LENGTH = 1_500_000;
const MAX_SCRAPED_TEXT_LENGTH = 120_000;
const MAX_VIEWER_TEXT_LENGTH = 200_000;
const SCRAPER_USER_AGENT = "OsonflowKnowledgeBaseBot/1.0";

function normalizeAndValidateWebsiteUrl(rawUrl: string): string {
    const normalized = rawUrl.trim();

    if (!normalized) {
        throw new ConvexError({
            code: "BAD_REQUEST",
            message: "Website URL is required",
        });
    }

    let parsed: URL;

    try {
        parsed = new URL(normalized);
    } catch {
        throw new ConvexError({
            code: "BAD_REQUEST",
            message: "Invalid website URL",
        });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new ConvexError({
            code: "BAD_REQUEST",
            message: "Website URL must start with http:// or https://",
        });
    }

    return parsed.toString();
}

function decodeHtmlEntities(content: string): string {
    return content
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&quot;", "\"")
        .replaceAll("&#39;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">");
}

function extractWebsiteTextFromHtml(html: string): {
    title?: string;
    description?: string;
    bodyText: string;
} {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descriptionMatch = html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
    );
    const ogDescriptionMatch = html.match(
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
    );

    const cleanedHtml = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ")
        .replace(/<[^>]+>/g, " ");

    const bodyText = decodeHtmlEntities(cleanedHtml).replace(/\s+/g, " ").trim();

    return {
        title: titleMatch?.[1]?.trim(),
        description: (descriptionMatch?.[1] || ogDescriptionMatch?.[1])?.trim(),
        bodyText,
    };
}

async function scrapeWebsite(url: string): Promise<{
    normalizedUrl: string;
    title: string;
    text: string;
}> {
    const normalizedUrl = normalizeAndValidateWebsiteUrl(url);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), SCRAPE_TIMEOUT_MS);

    try {
        const response = await fetch(normalizedUrl, {
            method: "GET",
            redirect: "follow",
            headers: {
                "User-Agent": SCRAPER_USER_AGENT,
                Accept: "text/html,text/plain;q=0.9,*/*;q=0.8",
            },
            signal: abortController.signal,
        });

        if (!response.ok) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: `Failed to scrape website (HTTP ${response.status})`,
            });
        }

        const contentType = (response.headers.get("content-type") || "").toLowerCase();
        if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Website does not return HTML/text content",
            });
        }

        const rawBody = (await response.text()).slice(0, MAX_SCRAPED_HTML_LENGTH);
        const parsedUrl = new URL(normalizedUrl);
        const fallbackTitle = parsedUrl.hostname;

        if (contentType.includes("text/plain")) {
            const bodyText = rawBody.replace(/\s+/g, " ").trim();

            if (!bodyText) {
                throw new ConvexError({
                    code: "BAD_REQUEST",
                    message: "No readable text found on the provided website",
                });
            }

            return {
                normalizedUrl,
                title: fallbackTitle,
                text: `Source URL: ${normalizedUrl}\n\n${bodyText.slice(0, MAX_SCRAPED_TEXT_LENGTH)}`,
            };
        }

        const extracted = extractWebsiteTextFromHtml(rawBody);

        if (!extracted.bodyText) {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "No readable text found on the provided website",
            });
        }

        const combinedText = [
            `Source URL: ${normalizedUrl}`,
            extracted.title ? `Page Title: ${extracted.title}` : null,
            extracted.description ? `Page Description: ${decodeHtmlEntities(extracted.description)}` : null,
            extracted.bodyText,
        ]
            .filter(Boolean)
            .join("\n\n")
            .slice(0, MAX_SCRAPED_TEXT_LENGTH);

        return {
            normalizedUrl,
            title: extracted.title || fallbackTitle,
            text: combinedText,
        };
    } catch (error) {
        if (error instanceof ConvexError) {
            throw error;
        }

        if (error instanceof Error && error.name === "AbortError") {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Website scraping timed out",
            });
        }

        throw new ConvexError({
            code: "BAD_REQUEST",
            message: "Failed to scrape website content",
        });
    } finally {
        clearTimeout(timeout);
    }
}


export const deleteFile = mutation({
    args: {
        entryId: vEntryId,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }

        const orgId = identity.orgId as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const namespace = await rag.getNamespace(ctx, {
            namespace: orgId,
        });

        if (!namespace) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Invalid namespace",
            });
        }

        const entry = await rag.getEntry(ctx, {
            entryId: args.entryId,
        })
        if (!entry) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Entry not found",
            });
        }

        if (entry.metadata?.uploadedBy !== orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Invalid Organization ID",
            });
        }
        if (entry.metadata?.storageId) {
            await ctx.storage.delete(entry.metadata.storageId as Id<'_storage'>)
        }

        await rag.deleteAsync(ctx, {
            entryId: args.entryId
        });
    }
})

export const addFile = action({
    args: {
        filename: v.string(),
        mimeType: v.string(),
        bytes: v.bytes(),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }

        const orgId = identity.orgId as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const subscription = await ctx.runQuery(
            internal.system.subscriptions.getByOrganizationId,
            {
                organizationId: orgId,
            },
        );

        if (subscription?.status !== "active") {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Missing subscription"
            })
        }

        const { bytes, filename, category } = args;
        const mimeType = args.mimeType || guessMimeType(filename, bytes);
        const blob = new Blob([bytes], { type: mimeType });

        const storageId = await ctx.storage.store(blob);
        const text = await extractTextContent(ctx, {
            storageId,
            filename,
            bytes,
            mimeType,
        });


        const { entryId, created } = await rag.add(ctx, {
            // SUPER IMPORTANT: What search space to add this to. You cannot search across namespaces,
            // If not added, it will be considered global (we do not want this)
            namespace: orgId,
            text,
            key: filename,
            title: filename,
            metadata: {
                storageId,
                uploadedBy: orgId, //import for deletion
                filename,
                category: category ?? null,
                sourceType: "file",
            } as EntryMetadata,
            contentHash: await contentHashFromArrayBuffer(bytes) // to avoid reinserting if the file content hasn't changed
        });


        if (!created) {
            console.debug("entry already exists, skipping upload metadata");
            await ctx.storage.delete(storageId);
        }

        return {
            url: await ctx.storage.getUrl(storageId),
            entryId,
        };
    },
});

export const addWebsite = action({
    args: {
        url: v.string(),
        title: v.optional(v.string()),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }

        const orgId = identity.orgId as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const subscription = await ctx.runQuery(
            internal.system.subscriptions.getByOrganizationId,
            {
                organizationId: orgId,
            },
        );

        if (subscription?.status !== "active") {
            throw new ConvexError({
                code: "BAD_REQUEST",
                message: "Missing subscription"
            })
        }

        const scraped = await scrapeWebsite(args.url);
        const providedTitle = args.title?.trim();
        const entryTitle = providedTitle || scraped.title;
        const sanitizedBaseFilename = entryTitle
            .replaceAll(/[^a-zA-Z0-9-_ ]/g, "")
            .trim()
            .replaceAll(/\s+/g, "-")
            .slice(0, 80) || "scraped-page";
        const storageFilename = `${sanitizedBaseFilename}.txt`;
        const storageBlob = new Blob([scraped.text], { type: "text/plain" });
        const storageId = await ctx.storage.store(storageBlob);

        const textBytes = new TextEncoder().encode(scraped.text);
        const textBuffer = textBytes.buffer.slice(
            textBytes.byteOffset,
            textBytes.byteOffset + textBytes.byteLength
        );

        const { entryId, created } = await rag.add(ctx, {
            namespace: orgId,
            text: scraped.text,
            key: entryTitle,
            title: entryTitle,
            metadata: {
                storageId,
                uploadedBy: orgId,
                filename: storageFilename,
                category: args.category ?? null,
                sourceUrl: scraped.normalizedUrl,
                sourceType: "website",
            } as EntryMetadata,
            contentHash: await contentHashFromArrayBuffer(textBuffer),
        });

        if (!created) {
            console.debug("website entry already exists, skipping upload metadata");
            await ctx.storage.delete(storageId);
        }

        return {
            entryId,
            created,
            sourceUrl: scraped.normalizedUrl,
            url: await ctx.storage.getUrl(storageId),
        };
    },
});

export const list = query({
    args: {
        category: v.optional(v.string()),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }

        const orgId = identity.orgId as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }
        const namespace = await rag.getNamespace(ctx, {
            namespace: orgId,
        });

        if (!namespace) {
            return { page: [], isDone: true, continueCursor: "" };
        }
        const results = await rag.list(ctx, {
            namespaceId: namespace.namespaceId,
            paginationOpts: args.paginationOpts,
        });

        const files = await Promise.all(
            results.page.map((entry) => convertEntryToPublicFile(ctx, entry))
        );
        const filteredFiles = args.category
            ? files.filter((file) => file.category === args.category)
            : files;
        return {
            page: filteredFiles,
            isDone: results.isDone,
            continueCursor: results.continueCursor,
        };
    },
});

export const getViewerContent = action({
    args: {
        entryId: vEntryId,
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (identity === null) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Identity not found",
            });
        }

        const orgId = identity.orgId as string;

        if (!orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Organization not found",
            });
        }

        const entry = await rag.getEntry(ctx, {
            entryId: args.entryId,
        });

        if (!entry) {
            throw new ConvexError({
                code: "NOT_FOUND",
                message: "Entry not found",
            });
        }

        const metadata = entry.metadata as EntryMetadata | undefined;
        const storageId = metadata?.storageId;
        const filename = metadata?.filename || entry.key || "Unknown";

        if (metadata?.uploadedBy !== orgId) {
            throw new ConvexError({
                code: "UNAUTHORIZED",
                message: "Invalid Organization ID",
            });
        }

        if (storageId) {
            const storageBlob = await ctx.storage.get(storageId);

            if (!storageBlob) {
                throw new ConvexError({
                    code: "NOT_FOUND",
                    message: "Stored file not found",
                });
            }

            const mimeType = storageBlob.type || "";
            const extension = filename.split(".").pop()?.toLowerCase() || "";
            const isTextLike =
                metadata?.sourceType === "website" ||
                mimeType.startsWith("text/") ||
                ["txt", "csv", "md", "json", "html", "xml"].includes(extension);

            if (isTextLike) {
                const rawText = new TextDecoder().decode(await storageBlob.arrayBuffer());
                return {
                    kind: "text" as const,
                    filename,
                    sourceUrl: metadata?.sourceUrl,
                    content: rawText.slice(0, MAX_VIEWER_TEXT_LENGTH),
                };
            }

            return {
                kind: "document" as const,
                filename,
                sourceUrl: metadata?.sourceUrl,
                url: await ctx.storage.getUrl(storageId),
            };
        }

        if (metadata?.sourceUrl) {
            const scraped = await scrapeWebsite(metadata.sourceUrl);
            return {
                kind: "text" as const,
                filename,
                sourceUrl: metadata.sourceUrl,
                content: scraped.text.slice(0, MAX_VIEWER_TEXT_LENGTH),
            };
        }

        throw new ConvexError({
            code: "NOT_FOUND",
            message: "No preview content available for this entry",
        });
    },
});

export type PublicFile = {
    id: EntryId;
    name: string;
    type: string;
    size: string;
    status: "ready" | "processing" | "error";
    url: string | null;
    category?: string;
};



type EntryMetadata = {
    storageId?: Id<"_storage">;
    uploadedBy: string;
    filename: string;
    category: string | null;
    sourceUrl?: string;
    sourceType?: "file" | "website";
};


async function convertEntryToPublicFile(
    ctx: QueryCtx,
    entry: Entry,
): Promise<PublicFile> {
    const metadata = entry.metadata as EntryMetadata | undefined;
    const storageId = metadata?.storageId;

    let fileSize = "unknown";

    if (storageId) {
        try {
            const storageMetadata = await ctx.db.system.get(storageId);
            if (storageMetadata) {
                fileSize = formatFileSize(storageMetadata.size);
            }
        } catch (error) {
            console.error("Failed to get storage metadata ", error)
        }
    }



    const filename = metadata?.filename || entry.key || "Unknown";
    const extension = metadata?.sourceType === "website"
        ? "url"
        : filename.split(".").pop()?.toLowerCase() || "txt";

    let status: "ready" | "processing" | "error" = "error";
    if (entry.status === "ready") {
        status = "ready";
    } else if (entry.status === "pending") {
        status = "processing";
    }

    const url = storageId
        ? await ctx.storage.getUrl(storageId)
        : metadata?.sourceUrl || null;
    return {
        id: entry.entryId,
        name: filename,
        type: extension,
        size: fileSize,
        status,
        url,
        category: metadata?.category || undefined,
    };

}


function formatFileSize(bytes: number): string {
    if (bytes === 0) {
        return "0 B";
    }

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}