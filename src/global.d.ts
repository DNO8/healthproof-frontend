declare module "secrets.js-grempe" {
  interface SplitOptions {
    shares: number;
    threshold: number;
    bits?: number;
    pad?: number;
  }
  interface CombineOptions {
    bits?: number;
  }
  export function split(secret: string, options: SplitOptions): string[];
  export function combine(shares: string[], options?: CombineOptions): string;
}

declare module "@scure/bip39" {
  export function encode(entropy: Uint8Array, wordlist: string[]): string;
  export function decode(mnemonic: string, wordlist: string[]): Uint8Array;
}

declare module "@scure/bip39/wordlists/english" {
  const wordlist: string[];
  export { wordlist };
}
