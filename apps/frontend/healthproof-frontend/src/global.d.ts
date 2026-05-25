declare module "secrets.js-grempe" {
  export function share(
    secret: string,
    numShares: number,
    threshold: number,
    padLength?: number
  ): string[];

  export function combine(shares: string[], at?: number): string;
  export function init(bits: number, rngType?: string): void;
  export function setRNG(rng?: string): void;
  export function str2hex(str: string, bytesPerChar?: number): string;
  export function hex2str(str: string, bytesPerChar?: number): string;
  export function random(bits: number): string;
}

declare module "@scure/bip39" {
  export function encode(entropy: Uint8Array, wordlist: string[]): string;
  export function decode(mnemonic: string, wordlist: string[]): Uint8Array;
}

declare module "@scure/bip39/wordlists/english" {
  const wordlist: string[];
  export { wordlist };
}
