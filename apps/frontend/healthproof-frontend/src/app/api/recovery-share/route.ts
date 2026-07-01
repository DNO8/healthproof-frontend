import { NextResponse } from "next/server";

/**
 * POST /api/recovery-share
 * DEPRECATED: This legacy endpoint is no longer supported.
 * SSS(2,3) recovery is now handled via /api/server-share/fetch.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Deprecated: use /api/server-share/fetch" },
    { status: 410 },
  );
}
