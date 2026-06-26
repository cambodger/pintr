"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { INVITE_COOKIE } from "@/lib/invite";

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

  // Came in via an invite link? Finish the join now and skip the group step.
  const jar = await cookies();
  const invite = jar.get(INVITE_COOKIE)?.value;
  if (invite && INVITE_CODE_RE.test(invite)) {
    const { error: joinErr } = await supabase.rpc("join_group", {
      p_code: invite,
    });
    jar.delete(INVITE_COOKIE);
    if (!joinErr) {
      redirect(`/?ping=${encodeURIComponent("🍻 You're in! Get the pints in.")}`);
    }
    // Join failed (dodgy code) — fall through to the normal group step.
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
