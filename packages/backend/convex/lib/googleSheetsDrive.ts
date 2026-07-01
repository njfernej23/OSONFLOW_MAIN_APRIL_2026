type DriveFile = {
  id?: string
  name?: string
  modifiedTime?: string
}

type DriveListResponse = {
  files?: DriveFile[]
  nextPageToken?: string
  error?: {
    message?: string
    code?: number
    status?: string
  }
}

type SpreadsheetMetadataResponse = {
  sheets?: Array<{
    properties?: {
      title?: string
    }
  }>
  error?: {
    message?: string
  }
}

type TokenInfoResponse = {
  scope?: string
  error?: string
  error_description?: string
}

export type GoogleSpreadsheetOption = {
  id: string
  name: string
}

const SPREADSHEET_MIME = "application/vnd.google-apps.spreadsheet"

const driveRequest = async <T>(accessToken: string, url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = (await response.json().catch(() => null)) as T & {
    error?: { message?: string }
  }

  if (!response.ok) {
    const message = payload?.error?.message || "Google Drive request failed."
    throw new Error(message)
  }

  return payload
}

export const assertGoogleDriveScope = async (accessToken: string) => {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  )

  const payload = (await response.json().catch(() => null)) as TokenInfoResponse | null

  if (!response.ok || !payload?.scope) {
    throw new Error(
      "Unable to verify Google permissions. Disconnect and reconnect your Google account."
    )
  }

  const scopes = payload.scope.split(" ")

  if (!scopes.some((scope) => scope.includes("drive"))) {
    throw new Error(
      "Google Drive access was not granted. Disconnect your account here, then reconnect and approve Drive access when Google asks."
    )
  }
}

const listDriveFiles = async (
  accessToken: string,
  {
    query,
    corpora = "user",
    includeAllDrives = false,
  }: {
    query: string
    corpora?: "user" | "allDrives"
    includeAllDrives?: boolean
  }
) => {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: query,
      fields: "nextPageToken,files(id,name,modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: "100",
      corpora,
    })

    if (includeAllDrives) {
      params.set("includeItemsFromAllDrives", "true")
      params.set("supportsAllDrives", "true")
    }

    if (pageToken) {
      params.set("pageToken", pageToken)
    }

    const payload = await driveRequest<DriveListResponse>(
      accessToken,
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`
    )

    files.push(...(payload.files ?? []))
    pageToken = payload.nextPageToken
  } while (pageToken)

  return files
}

export const listGoogleSpreadsheets = async (
  accessToken: string
): Promise<GoogleSpreadsheetOption[]> => {
  await assertGoogleDriveScope(accessToken)

  const seen = new Set<string>()
  const spreadsheets: GoogleSpreadsheetOption[] = []

  const addFiles = (files: DriveFile[]) => {
    for (const file of files) {
      const id = file.id?.trim()
      const name = file.name?.trim()

      if (!id || !name || seen.has(id)) {
        continue
      }

      seen.add(id)
      spreadsheets.push({ id, name })
    }
  }

  const baseQuery = `mimeType='${SPREADSHEET_MIME}' and trashed=false`

  const queries = [
    baseQuery,
    `${baseQuery} and sharedWithMe=true`,
    `${baseQuery} and 'me' in owners`,
  ]

  for (const query of queries) {
    try {
      const files = await listDriveFiles(accessToken, { query })
      addFiles(files)
    } catch {
      // Try the next query shape if one variant fails for this account.
    }
  }

  try {
    const sharedDriveFiles = await listDriveFiles(accessToken, {
      query: baseQuery,
      corpora: "allDrives",
      includeAllDrives: true,
    })
    addFiles(sharedDriveFiles)
  } catch {
    // Shared drives are optional for most accounts.
  }

  return spreadsheets.sort((left, right) => left.name.localeCompare(right.name))
}

export const listSpreadsheetTabs = async (
  accessToken: string,
  spreadsheetId: string
): Promise<string[]> => {
  const payload = await driveRequest<SpreadsheetMetadataResponse>(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`
  )

  return (payload.sheets ?? [])
    .map((sheet) => sheet.properties?.title?.trim())
    .filter((title): title is string => Boolean(title))
}
