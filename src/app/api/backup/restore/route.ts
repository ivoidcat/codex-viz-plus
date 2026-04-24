import { NextResponse } from "next/server";
import { restoreAllSessions } from "@/lib/indexer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sourceDir = typeof body?.sourceDir === "string" ? body.sourceDir : "";

  if (!sourceDir.trim()) {
    return NextResponse.json({ error: "missing sourceDir" }, { status: 400 });
  }

  try {
    const result = await restoreAllSessions(sourceDir);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
