import { Address } from "viem";

// Token related types
export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
  logo?: string;
}

export interface TokenBalance {
  tokenAddress: string;
  balance: string;
  token?: {
    symbol: string;
    decimals: number;
    name: string;
    logo?: string;
  };
  formattedBalance: string;
  price?: {
    value: number;
    diff_24h: number;
  };
  value?: number;
  tokenId?: string;
}

// Mapping of tokens by blockchain
export type SymbolMapping = Record<string, TokenInfo | undefined>;
export type BlockchainMapping = Record<number, SymbolMapping>;

// Field parsing
export type FieldParser<T> = {
  [K in keyof T]: (v: string) => T[K];
};

export const addressField = (v: string): Address => v as Address;
export const numberField = (v: string): number => parseInt(v, 10);

export function validateInput<T>(
  search: URLSearchParams,
  parsers: FieldParser<T>
): T {
  const result = {} as T;

  for (const key in parsers) {
    const value = search.get(key);
    if (!value) {
      throw new Error(`Missing parameter: ${key}`);
    }

    try {
      (result as any)[key] = parsers[key](value);
    } catch (e) {
      throw new Error(`Invalid ${key}: ${value}`);
    }
  }

  return result;
}

// Transaction data type
export interface TxData {
  to?: Address;
  data?: string;
  value?: string;
  gas?: string;
  transaction?: any;
  meta?: {
    orderData?: string;
    [key: string]: any;
  };
}

// Request handler
export async function handleRequest<T, R>(
  req: any,
  logic: (req: any) => Promise<T>,
  respond: (result: T) => R
): Promise<R> {
  try {
    const result = await logic(req);
    return respond(result);
  } catch (error: any) {
    console.error("Error processing request:", error);
    throw error;
  }
}