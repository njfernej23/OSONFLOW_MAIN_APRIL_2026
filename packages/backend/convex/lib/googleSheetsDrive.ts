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
  const seen = new Set<string>()
  const spreadsheets: GoogleSpreadsheetOption[] = []
  let lastError: Error | null = null

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

  try {
    const files = await listDriveFiles(accessToken, { query: baseQuery })
    addFiles(files)
  } catch (error) {
    lastError = error instanceof Error ? error : new Error("Google Drive request failed.")
  }

  if (spreadsheets.length === 0 && lastError) {
    if (lastError.message.toLowerCase().includes("insufficient")) {
      throw new Error(
        "Google Drive access was not granted. Disconnect your account, remove Osonflow from Google account permissions, then reconnect and approve Drive access."
      )
    }

    if (lastError.message.toLowerCase().includes("has not been used")) {
      throw new Error(
        "Enable the Google Drive API in Google Cloud Console for your OAuth project, then try again."
      )
    }

    throw lastError
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

type SheetValuesResponse = {
  values?: string[][]
  error?: {
    message?: string
  }
}

const sheetsMetadataRequest = async <T>(
  url: string,
  headers?: Record<string, string>
): Promise<T> => {
  const response = await fetch(url, { headers })
  const payload = (await response.json().catch(() => null)) as T & {
    error?: { message?: string }
  }

  if (!response.ok) {
    const message = payload?.error?.message || "Google Sheets request failed."
    throw new Error(message)
  }

  return payload
}

export const listSpreadsheetTabsWithApiKey = async (
  apiKey: string,
  spreadsheetId: string
): Promise<string[]> => {
  const payload = await sheetsMetadataRequest<SpreadsheetMetadataResponse>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title&key=${apiKey}`
  )

  return (payload.sheets ?? [])
    .map((sheet) => sheet.properties?.title?.trim())
    .filter((title): title is string => Boolean(title))
}

export const listSpreadsheetColumnHeaders = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[]> => {
  const encodedRange = encodeURIComponent(`${sheetName}!1:1`)
  const payload = await driveRequest<SheetValuesResponse>(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`
  )

  return (payload.values?.[0] ?? [])
    .map((header) => header.trim())
    .filter(Boolean)
}

export const listSpreadsheetColumnHeadersWithApiKey = async (
  apiKey: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[]> => {
  const encodedRange = encodeURIComponent(`${sheetName}!1:1`)
  const payload = await sheetsMetadataRequest<SheetValuesResponse>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`
  )

  return (payload.values?.[0] ?? [])
    .map((header) => header.trim())
    .filter(Boolean)
}
