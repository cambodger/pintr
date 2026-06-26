"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function leaveGroup(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "");
  if (!UUID_RE.test(groupId)) {
    redirect("/group?status=failed");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_group", { p_group_id: groupId });

  if (error) {
    console.error("leave_group failed:", error.message);
    redirect("/group?status=failed");
  }

  redirect("/");
}
