"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function saveExamResult(data: {
  exam_id: string | null;
  cid: string;
  iv: string;
  file_hash: string;
  encrypted_keys: Record<string, { data: string; iv: string }>;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("exam_results").insert({
    exam_id: data.exam_id,
    cid: data.cid,
    iv: data.iv,
    file_hash: data.file_hash,
    encrypted_keys: data.encrypted_keys,
  });

  if (error) {
    console.error("saveExamResult error:", error);
    return { error: error.message };
  }

  return { success: true };
}
