"use server";

import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Dev-only: sign in as a test user with the shared password from
 * DEV_LOGIN_PASSWORD (.env.local, gitignored). Production builds 404 — and
 * the password only exists on the +pintrdevN test users anyway.
 */
export async function devLogin(formData: FormData) {
  if (
    process.env.NODE_ENV !== "development" ||
    !process.env.DEV_LOGIN_PASSWORD
  ) {
    notFound();
  }

  const email = String(formData.get("email") ?? "");
  if (!/^andrewtjones85\+pintrdev\d+@gmail\.com$/.test(email)) {
    notFound();
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: process.env.DEV_LOGIN_PASSWORD,
  });

  if (error) {
    console.error("devLogin failed:", error.message);
    redirect("/dev-login?status=failed");
  }

  redirect("/");
}
