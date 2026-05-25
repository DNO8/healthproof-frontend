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
