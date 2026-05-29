const SESSION_KEYS = [
  "hp_keys_synced",
  "hp_keys_sync_error",
  "hp_server_share_attempted",
  "hp_recovery_state",
  "hp_dashboard_stats_error",
  "hp_db_user",
  "hp_onchain_role",
  "hp_upserted",
  "hp_wallet_synced",
  "hp_logging_out",
  "hp_tour_pending",
  "hp_registered_role",
  "hp_register_attempts",
];

const LOCAL_KEYS = [
  "hp_intended_role",
  "hp_selected_role",
  "hp_last_user_id",
];

export function clearUserSession() {
  try {
    for (const key of SESSION_KEYS) {
      sessionStorage.removeItem(key);
    }
    for (const key of LOCAL_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
