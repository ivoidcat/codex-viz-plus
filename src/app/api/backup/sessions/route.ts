import { NextResponse } from "next/server";
import { backupAllSessions } from "@/lib/indexer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const targetDir = typeof body?.targetDir === "string" ? body.targetDir : "";
  const mode = body?.mode === "full" ? "full" : "incremental";

  if (!targetDir.trim()) {
    return NextResponse.json({ error: "missing targetDir" }, { status: 400 });
  }

  try {
    const result = await backupAllSessions(targetDir, { mode });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
