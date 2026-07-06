/**
 * Placeholders for PHI (Protected Health Information) redaction.
 *
 * These tokens are used to replace personally identifiable information in medical
 * document text before sending it to AI models. The original values are kept in a
 * client-side map and reinserted into the generated FHIR bundle locally.
 *
 * The `<<PHI_...>>` format is chosen to minimize collision with normal text.
 */

export const PHI_PLACEHOLDER = {
  RUT: "<<PHI_RUT>>",
  NAME: "<<PHI_NAME>>",
  BIRTH_DATE: "<<PHI_BIRTH_DATE>>",
  ADDRESS: "<<PHI_ADDRESS>>",
  PHONE: "<<PHI_PHONE>>",
  EMAIL: "<<PHI_EMAIL>>",
} as const;

export type PhiPlaceholderKey = keyof typeof PHI_PLACEHOLDER;
export type PhiPlaceholder = (typeof PHI_PLACEHOLDER)[PhiPlaceholderKey];
