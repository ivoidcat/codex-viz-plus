import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { resolveSessionFile } from "@/lib/indexer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safeExportName(id: string) {
  return `${id}`.replace(/[^\w.-]+/g, "_");
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await resolveSessionFile(id);

  if (!file) {
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  }

  const stream = fs.createReadStream(file);
  const body = Readable.toWeb(stream) as unknown as ReadableStream;
  const fileName = `${safeExportName(id)}.jsonl`;
  const contentDisposition = `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/jsonl; charset=utf-8",
      "Content-Disposition": contentDisposition,
      "Cache-Control": "no-store"
    }
  });
}
