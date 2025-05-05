import { Address } from "viem";
import { ANKR_API_ENDPOINT, CHAIN_SLUGS } from "../../config";

/**
 * Interface for token information returned by ANKR API
 */
export interface TokenInfo {
  address: string;
  blockchain: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  contractDeployer?: string;
  deploymentTxHash?: string;
  creationTimestamp?: string;
  logo?: string;
  usdPrice?: number;
  marketCap?: number;
  priceChange24h?: number;
  priceChange24hPercentage?: number;
  volume24h?: number;
}

/**
 * Get token metadata from ANKR API
 */
export async function getTokenMetadata(
  contractAddress: string,
  chainId: number
): Promise<TokenInfo | null> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
    if (!chainSlug) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_getTokenMetadata',
        params: {
          blockchain: chainSlug,
          contractAddress,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting token metadata:', data.error);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('Error in getTokenMetadata:', error);
    return null;
  }
}

/**
 * Get token price from ANKR API
 */
export async function getTokenPrice(
  contractAddress: string,
  chainId: number
): Promise<{ usdPrice?: number; priceChange24h?: number } | null> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
    if (!chainSlug) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_getTokenPrice',
        params: {
          blockchain: chainSlug,
          contractAddress,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting token price:', data.error);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('Error in getTokenPrice:', error);
    return null;
  }
}

/**
 * Find tokens by name or symbol
 */
export async function findTokens(
  searchQuery: string,
  chainId?: number
): Promise<TokenInfo[]> {
  try {
    const params: any = {
      query: searchQuery,
    };

    if (chainId) {
      const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
      if (chainSlug) {
        params.blockchain = chainSlug;
      }
    }

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_findToken',
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error finding tokens:', data.error);
      return [];
    }

    return data.result?.tokens || [];
  } catch (error) {
    console.error('Error in findTokens:', error);
    return [];
  }
}

/**
 * Get token allowances for an address
 */
export async function getTokenAllowances(
  ownerAddress: Address,
  tokenAddress: string,
  spenderAddress: Address,
  chainId: number
): Promise<any | null> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
    if (!chainSlug) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_getTokenAllowance',
        params: {
          blockchain: chainSlug,
          ownerAddress,
          tokenAddress,
          spenderAddress,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting token allowance:', data.error);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('Error in getTokenAllowances:', error);
    return null;
  }
}