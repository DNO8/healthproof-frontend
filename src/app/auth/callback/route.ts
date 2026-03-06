import { NextResponse } from "next/server";

// Supabase auth callback is no longer used. Auth is handled by Privy client-side.
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/dashboard`);
}
