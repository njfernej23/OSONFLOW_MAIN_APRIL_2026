type DriveFile = {
  id?: string
  name?: string
}

type DriveListResponse = {
  files?: DriveFile[]
  nextPageToken?: string
  error?: {
    message?: string
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
    throw new Error(payload?.error?.message || "Google Drive request failed.")
  }

  return payload
}

export const listGoogleSpreadsheets = async (
  accessToken: string
): Promise<GoogleSpreadsheetOption[]> => {
  const spreadsheets: GoogleSpreadsheetOption[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "nextPageToken,files(id,name)",
      orderBy: "modifiedTime desc",
      pageSize: "100",
    })

    if (pageToken) {
      params.set("pageToken", pageToken)
    }

    const payload = await driveRequest<DriveListResponse>(
      accessToken,
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`
    )

    for (const file of payload.files ?? []) {
      const id = file.id?.trim()
      const name = file.name?.trim()

      if (id && name) {
        spreadsheets.push({ id, name })
      }
    }

    pageToken = payload.nextPageToken
  } while (pageToken)

  return spreadsheets
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
