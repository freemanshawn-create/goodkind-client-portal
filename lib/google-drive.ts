import { google } from "googleapis";

/**
 * Google Drive API client (service account authentication).
 *
 * Reuses GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY from the same
 * Google Cloud service account used for Google Sheets.
 *
 * The service account needs Viewer access on the shared drive folder(s) it
 * needs to read — share folders with its email address from the Drive UI.
 */

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
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
}

let _drive: ReturnType<typeof google.drive> | null = null;

export function getDriveClient() {
  if (!_drive) {
    _drive = google.drive({ version: "v3", auth: getAuth() });
  }
  return _drive;
}

/**
 * Stream the binary content of a file by ID. Returns the raw Node.js Readable
 * stream from googleapis so the caller can pipe it back as an HTTP response.
 */
export async function downloadFile(fileId: string) {
  const drive = getDriveClient();
  // First fetch metadata so we know the mime type + name
  const meta = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,size",
    supportsAllDrives: true,
  });

  // For Google-native types (Docs/Sheets/Slides) we have to export rather
  // than download — pick a sensible default format per type.
  const mimeType = meta.data.mimeType ?? "application/octet-stream";
  const googleExports: Record<string, string> = {
    "application/vnd.google-apps.document":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.google-apps.spreadsheet":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.google-apps.presentation":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.google-apps.drawing": "image/png",
  };

  if (googleExports[mimeType]) {
    const exportRes = await drive.files.export(
      { fileId, mimeType: googleExports[mimeType] },
      { responseType: "stream" }
    );
    return {
      stream: exportRes.data,
      mimeType: googleExports[mimeType],
      name: meta.data.name ?? "file",
    };
  }

  const fileRes = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
  return {
    stream: fileRes.data,
    mimeType,
    name: meta.data.name ?? "file",
  };
}
