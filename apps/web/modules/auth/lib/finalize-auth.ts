import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"

type Finalizable = {
  status: string
  finalize: (options: {
    navigate: (params: {
      session?: { currentTask?: { key: string } | null }
      decorateUrl: (path: string) => string
    }) => void | Promise<void>
  }) => Promise<{ error: unknown } | void>
}

function navigateAfterAuth(
  router: AppRouterInstance,
  url: string
) {
  if (url.startsWith("http")) {
    window.location.href = url
    return
  }
  router.push(url)
}

function getPostAuthDestination(
  session: { currentTask?: { key: string } | null } | undefined,
  fallbackUrl: string
) {
  if (session?.currentTask?.key === "choose-organization") {
    return "/org-selection"
  }

  return fallbackUrl
}

export async function finalizeAuthSession(
  resource: Finalizable,
  router: AppRouterInstance,
  fallbackUrl: string
) {
  if (resource.status !== "complete") {
    return false
  }

  await resource.finalize({
    navigate: ({ session, decorateUrl }) => {
      const destination = getPostAuthDestination(session, fallbackUrl)
      navigateAfterAuth(router, decorateUrl(destination))
    },
  })

  return true
}
