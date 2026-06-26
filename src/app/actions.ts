"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Worst case the server session lingers until expiry; still send the
    // user to /login so the UI state is consistent.
    console.error("signOut failed:", error.message);
  }
  redirect("/login");
}

/**
 * Flip ghost mode. The form posts the NEW value, so the home page renders
 * either "Go invisible" (ghost=true) or "Back online" (ghost=false).
 */
export async function setGhost(formData: FormData) {
  const ghost = String(formData.get("ghost") ?? "") === "true";
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ghost", { p_ghost: ghost });
  if (error) {
    console.error("set_ghost failed:", error.message);
  }
  redirect("/");
}

/** Stop sharing a location (appends a 'cleared' presence event). */
export async function clearPresence() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_presence");
  if (error) {
    console.error("clear_presence failed:", error.message);
  }
  redirect("/");
}
