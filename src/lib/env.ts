export const env = {
  PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "",
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_KEY: process.env.NEXT_PUBLIC_SUPABASE_KEY ?? "",
  SUPABASE_SECRET_KEY: process.env.NEXT_SUPABASE_SECRET_KEY ?? "",
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001",
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL ?? "",
  CHAIN_ID: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "0"),
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
  PINATA_JWT: process.env.PINATA_JWT_SECRET ?? "",
  PINATA_GATEWAY: (() => {
    const gw = process.env.NEXT_PUBLIC_PINATA_GATEWAY ?? "gateway.pinata.cloud";
    return gw.startsWith("http") ? gw : `https://${gw}`;
  })(),
} as const;
