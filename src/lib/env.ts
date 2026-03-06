export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "",
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001",
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL ?? "",
  CHAIN_ID: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "0"),
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
  PINATA_JWT: process.env.PINATA_JWT_SECRET ?? "",
  PINATA_GATEWAY:
    process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "https://gateway.pinata.cloud",
} as const;
