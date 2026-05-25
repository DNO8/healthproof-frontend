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
