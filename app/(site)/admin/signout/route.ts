// app/admin/signout/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../lib/supabaseServer";

export async function POST() {
  const supabase = getSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
