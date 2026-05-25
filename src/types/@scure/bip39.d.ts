declare module "@scure/bip39" {
  export function encode(entropy: Uint8Array, wordlist: string[]): string;
  export function decode(mnemonic: string, wordlist: string[]): Uint8Array;
}

declare module "@scure/bip39/wordlists/english" {
  const wordlist: string[];
  export { wordlist };
}
