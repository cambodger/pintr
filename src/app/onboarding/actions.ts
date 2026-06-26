"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Mutations go through SECURITY DEFINER SQL functions via supabase.rpc() —
// never direct table writes (see AGENTS.md). The functions validate the
// caller and enforce invariants.

const INVITE_CODE_RE = /^[0-9a-f]{20}$/; // 10 random bytes, hex-encoded

function statusForRpcError(message: string): string {
  if (message.includes("invalid invite code")) return "bad_invite_code";
  if (message.includes("display name")) return "invalid_name";
  if (message.includes("group name")) return "invalid_group";
  return "rpc_failed";
}

export async function saveProfile(formData: FormData) {
  const name = String(formData.get("display_name") ?? "").trim();
  const emoji = String(formData.get("pin_emoji") ?? "").trim() || "📍";

  if (!name || name.length > 80) {
    redirect("/onboarding?status=invalid_name");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_profile", {
    p_display_name: name,
    p_pin_emoji: emoji,
  });

  if (error) {
    console.error("save_profile failed:", error.message);
    redirect(`/onboarding?status=${statusForRpcError(error.message)}`);
  }

  redirect("/onboarding?status=profile_saved");
}

export async function createGroup(formData: FormData) {
  const name = String(formData.get("group_name") ?? "").trim();

  if (!name || name.length > 80) {
    redirect("/onboarding?status=invalid_group");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_group", { p_name: name });

  if (error) {
    console.error("create_group failed:", error.message);
    redirect(`/onboarding?status=${statusForRpcError(error.message)}`);
  }

  redirect("/");
}

export async function joinGroup(formData: FormData) {
  const code = String(formData.get("invite_code") ?? "")
    .trim()
    .toLowerCase();

  if (!INVITE_CODE_RE.test(code)) {
    redirect("/onboarding?status=bad_invite_code");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_group", { p_code: code });

  if (error) {
    console.error("join_group failed:", error.message);
    redirect(`/onboarding?status=${statusForRpcError(error.message)}`);
  }

  redirect("/");
}
