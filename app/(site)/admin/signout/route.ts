
// app/(site)/admin/signout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierre de sesión vía POST (botón/formulario)
export async function POST(req: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url));
}

// (Opcional) Cierre de sesión vía GET (enlace)
export async function GET(req: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url));
}
