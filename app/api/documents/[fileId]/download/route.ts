import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { downloadFile } from "@/lib/google-drive";

/**
 * Streams a Google Drive file back to the client.
 *
 * Auth is enforced by Clerk's middleware (the API route is protected by
 * default — see middleware.ts). For now, ANY authenticated user can request
 * any file ID. TODO: verify the file is a descendant of the user's active
 * organization's driveFolderId before serving — otherwise a Dr. Squatch user
 * who somehow knows a Jukebox file ID could fetch it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  if (!fileId) {
    return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
  }

  try {
    const { stream, mimeType, name } = await downloadFile(fileId);

    // Convert Node Readable to a Web ReadableStream so we can return it
    // from a Next.js Route Handler.
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err: Error) => controller.error(err));
      },
    });

    // Use inline display when the browser knows how to render it (PDF, images),
    // attachment for anything else — Drive's mime types are pretty reliable.
    const disposition =
      mimeType.startsWith("image/") || mimeType === "application/pdf"
        ? "inline"
        : "attachment";

    return new Response(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("Drive download failed:", err);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
