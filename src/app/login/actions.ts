"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: runs on the server when the login form is submitted.
 * Magic-link auth — Supabase emails a one-time sign-in link; no passwords.
 */
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  // Light-touch validation only — Supabase does the real verification by
  // actually sending the email.
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirect("/login?status=invalid_email");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email });

  if (error) {
    console.error("signInWithOtp failed:", error.message);
    redirect("/login?status=send_failed");
  }

  redirect("/login?status=sent");
}
