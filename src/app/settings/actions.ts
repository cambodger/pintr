"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const name = String(formData.get("display_name") ?? "").trim();
  const emoji = String(formData.get("pin_emoji") ?? "").trim() || "📍";

  if (!name || name.length > 80) {
    redirect("/settings?status=invalid_name");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_profile", {
    p_display_name: name,
    p_pin_emoji: emoji,
  });

  if (error) {
    console.error("save_profile failed:", error.message);
    redirect("/settings?status=failed");
  }

  redirect("/settings?status=saved");
}

export async function updateStatus(formData: FormData) {
  const text = String(formData.get("status_text") ?? "").trim();
  const emoji = String(formData.get("status_emoji") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_status", {
    p_status_text: text,
    p_status_emoji: emoji,
  });

  if (error) {
    console.error("set_status failed:", error.message);
    redirect("/settings?status=failed");
  }

  redirect("/settings?status=status_saved");
}

export async function toggleGhost(formData: FormData) {
  const ghost = String(formData.get("ghost") ?? "") === "true";

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ghost", { p_ghost: ghost });

  if (error) {
    console.error("set_ghost failed:", error.message);
    redirect("/settings?status=failed");
  }

  redirect("/settings?status=ghost_saved");
}
