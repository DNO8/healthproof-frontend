"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function createPermission(data: {
  patient_id: string;
  granted_to_id: string;
  resource_type: "RESULT" | "ORDER";
  resource_id: string;
  encrypted_key: string;
  onchain_tx_hash: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("permissions").insert({
    patient_id: data.patient_id,
    granted_to_id: data.granted_to_id,
    resource_type: data.resource_type,
    resource_id: data.resource_id,
    status: "ACTIVE",
    encrypted_key: data.encrypted_key,
    onchain_tx_hash: data.onchain_tx_hash,
  });

  if (error) {
    console.error("createPermission error:", error);
    return { error: error.message };
  }

  return { success: true };
}
