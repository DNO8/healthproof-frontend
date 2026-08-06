import { KMSClient } from "@aws-sdk/client-kms";

const region = process.env.AWS_REGION ?? "us-east-2";

/**
 * Singleton AWS KMS client for HealthProof.
 * Uses credentials from environment (IAM role preferred in production).
 */
export const kmsClient = new KMSClient({ region });
