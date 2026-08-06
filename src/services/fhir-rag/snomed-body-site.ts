/**
 * SNOMED CT body site mapping for abdominal ultrasound regions.
 * If SNOMED CT is not licensed, the UI should fall back to bodySite.text.
 */

export interface BodySiteMapping {
  snomedCode: string | null;
  display: string;
}

const SNOMED_BODY_SITES: Record<string, BodySiteMapping> = {
  kidney: { snomedCode: "64033007", display: "Kidney" },
  renal: { snomedCode: "64033007", display: "Kidney" },
  rinon: { snomedCode: "64033007", display: "Kidney" },
  riñon: { snomedCode: "64033007", display: "Kidney" },
  liver: { snomedCode: "10200004", display: "Liver" },
  higado: { snomedCode: "10200004", display: "Liver" },
  hígado: { snomedCode: "10200004", display: "Liver" },
  spleen: { snomedCode: "78961009", display: "Spleen" },
  bazo: { snomedCode: "78961009", display: "Spleen" },
  bladder: { snomedCode: "66754008", display: "Urinary bladder" },
  vejiga: { snomedCode: "66754008", display: "Urinary bladder" },
  gallbladder: { snomedCode: "28231008", display: "Gallbladder" },
  vesicula: { snomedCode: "28231008", display: "Gallbladder" },
  vesícula: { snomedCode: "28231008", display: "Gallbladder" },
  pancreas: { snomedCode: "15776009", display: "Pancreas" },
  páncreas: { snomedCode: "15776009", display: "Pancreas" },
};

export function mapRegionToBodySite(region: string): BodySiteMapping | null {
  if (!region) return null;
  const key = region.toLowerCase().trim();
  return SNOMED_BODY_SITES[key] ?? null;
}

export function getBodySiteDisplay(region: string): string {
  return mapRegionToBodySite(region)?.display ?? region;
}

export function getBodySiteSnomed(region: string): string | null {
  return mapRegionToBodySite(region)?.snomedCode ?? null;
}
