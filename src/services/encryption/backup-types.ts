"use client";

/**
 * Backup method constants following TypeScript const pattern
 */
export const BACKUP_METHOD = {
  EMAIL: "email",
  WALLET: "wallet",
} as const;

export type BackupMethod = (typeof BACKUP_METHOD)[keyof typeof BACKUP_METHOD];

/**
 * User backup info interface - flat structure
 */
export interface UserBackupInfo {
  id: string;
  walletAddress: string | null;
  email: string | null;
  encryptedPrivateKey: string | null;
  publicKey: string | null;
  backupMethod: BackupMethod;
}

/**
 * Type guard to check if user is OAuth (no password set)
 */
export function isOAuthUser(
  userEmail: string | undefined | null,
  hasPassword: boolean | undefined
): boolean {
  return !hasPassword && !!userEmail;
}

/**
 * Determine backup method based on user type
 */
export function getBackupMethod(
  userEmail: string | undefined | null,
  walletAddress: string | undefined | null,
  hasPassword: boolean | undefined
): BackupMethod {
  if (isOAuthUser(userEmail, hasPassword) && walletAddress) {
    return BACKUP_METHOD.WALLET;
  }
  return BACKUP_METHOD.EMAIL;
}

/**
 * Create recovery password based on backup method
 * - EMAIL: email|password (user-provided)
 * - WALLET: walletAddress|userId (auto-generated, no user input needed)
 */
export function createRecoveryPassword(
  identifier: string,
  secret: string
): string {
  return `${identifier.toLowerCase().trim()}|${secret}`;
}
