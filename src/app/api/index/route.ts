import { NextResponse } from "next/server";
import { getIndex } from "@/lib/indexer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const day = searchParams.get("day");
  const index = await getIndex({ day });
  return NextResponse.json(index);
}
