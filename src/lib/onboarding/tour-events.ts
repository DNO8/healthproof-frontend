export const TOUR_PENDING_EVENT = "hp:tour-pending";
export const TOUR_PENDING_KEY = "hp_tour_pending";

export function requestTourStart() {
  try {
    localStorage.setItem(TOUR_PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(TOUR_PENDING_EVENT));
  } catch {
    /* ignore */
  }
}
