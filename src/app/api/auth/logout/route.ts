import { createSupabaseServer } from "@/lib/supabase";
import { redirect } from "next/navigation";

export async function GET() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
