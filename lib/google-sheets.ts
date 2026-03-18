import { google } from "googleapis";

// =============================================================================
// Google Sheets API client (service account authentication)
//
// Required env vars:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL — service account email
//   GOOGLE_PRIVATE_KEY           — PEM private key (with literal \n newlines)
//   GOOGLE_SHEET_ID              — spreadsheet ID from the URL
//   GOOGLE_SHEET_NAME            — sheet/tab name (e.g. "Batch Schedule 0313")
// =============================================================================

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY"
    );
  }

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

let _sheets: ReturnType<typeof google.sheets> | null = null;

function getSheetsClient() {
  if (!_sheets) {
    _sheets = google.sheets({ version: "v4", auth: getAuth() });
  }
  return _sheets;
}

/**
 * Fetch all rows from the configured sheet.
 * Returns the header row + data rows as string[][].
 */
export async function getSheetData(
  sheetName?: string
): Promise<string[][]> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = sheetName ?? process.env.GOOGLE_SHEET_NAME ?? "Sheet1";

  if (!spreadsheetId) {
    throw new Error("Missing GOOGLE_SHEET_ID env var");
  }

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: tabName,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  return (res.data.values as string[][]) ?? [];
}
