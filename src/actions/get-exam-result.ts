"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ExamResultRow {
  id: string;
  exam_id: string | null;
  cid: string;
  iv: string;
  file_hash: string;
  encrypted_keys: Record<string, { data: string; iv: string }>;
  created_at: string;
}

export async function getExamResult(
  resultId: string,
): Promise<ExamResultRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("exam_results")
    .select("id, exam_id, cid, iv, file_hash, encrypted_keys, created_at")
    .eq("id", resultId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ExamResultRow;
}

export async function listExamResultsForUser(
  userId: string,
): Promise<ExamResultRow[]> {
  const supabase = createAdminClient();

  // Fetch results where the user has an encrypted key entry
  const { data, error } = await supabase
    .from("exam_results")
    .select("id, exam_id, cid, iv, file_hash, encrypted_keys, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  // Filter client-side: only results where the user has an encrypted key
  return (data as ExamResultRow[]).filter((r) => r.encrypted_keys?.[userId]);
}
