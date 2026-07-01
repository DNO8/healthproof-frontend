/**
 * KMS (Key Management Service) abstraction interface.
 * Allows switching between environment variable storage and cloud KMS providers.
 */

export interface KMSProvider {
  /**
   * Get the deployer private key for signing transactions.
   * @returns The private key as a hex string (without 0x prefix)
   */
  getPrivateKey(): Promise<string>;

  /**
   * Get the Shamir encryption key for key backup/recovery.
   * @returns The encryption key as a hex string
   */
  getShamirKey(): Promise<string>;

  /**
   * Health check for the KMS provider.
   * @returns true if the provider is accessible
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Environment variable KMS provider (default).
 * Reads keys from process.env - suitable for development and simple deployments.
 */
export class EnvKMSProvider implements KMSProvider {
  async getPrivateKey(): Promise<string> {
    const key = process.env.DEPLOYER_PRIVATE_KEY;
    if (!key) throw new Error("DEPLOYER_PRIVATE_KEY not set");
    return key.replace(/^0x/, "");
  }

  async getShamirKey(): Promise<string> {
    const key = process.env.SHAMIR_ENCRYPTION_KEY;
    if (!key) throw new Error("SHAMIR_ENCRYPTION_KEY not set");
    return key;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getPrivateKey();
      await this.getShamirKey();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * AWS KMS provider (placeholder for future implementation).
 * Would use AWS SDK to decrypt keys stored in AWS KMS.
 */
export class AWSKMSProvider implements KMSProvider {
  constructor(_keyId: string) {}

  async getPrivateKey(): Promise<string> {
    // TODO: Implement AWS KMS decrypt
    // const kms = new KMSClient();
    // const command = new DecryptCommand({ CiphertextBlob: ... });
    // const response = await kms.send(command);
    // return Buffer.from(response.Plaintext).toString('hex');
    throw new Error("AWS KMS not yet implemented");
  }

  async getShamirKey(): Promise<string> {
    // TODO: Implement AWS KMS decrypt
    throw new Error("AWS KMS not yet implemented");
  }

  async healthCheck(): Promise<boolean> {
    // TODO: Implement AWS KMS health check
    return false;
  }
}

/**
 * Current KMS provider instance.
 * Default to EnvKMSProvider, can be swapped via setKMSProvider.
 */
let kmsProvider: KMSProvider = new EnvKMSProvider();

export function setKMSProvider(provider: KMSProvider): void {
  kmsProvider = provider;
}

export function getKMSProvider(): KMSProvider {
  return kmsProvider;
}

/**
 * Convenience function to get deployer private key via current KMS provider.
 */
export async function getDeployerPrivateKeyKMS(): Promise<string> {
  return kmsProvider.getPrivateKey();
}

/**
 * Convenience function to get Shamir encryption key via current KMS provider.
 */
export async function getShamirKeyKMS(): Promise<string> {
  return kmsProvider.getShamirKey();
}
