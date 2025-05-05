import { Address } from "viem";
import { ANKR_API_ENDPOINT, CHAIN_SLUGS } from "../../config";
import { TokenBalance } from "../../types/agent-sdk";
import { NATIVE_ASSET } from "../util";

/**
 * Get token balances for a safe address using ANKR API
 *
 * @param chainId The chain ID
 * @param safeAddress The safe address
 * @param _apiKey Optional API key (not used with ANKR, kept for compatibility)
 * @returns Array of token balances
 */
export async function getSafeBalances(
  chainId: number,
  safeAddress: Address,
  _apiKey?: string
): Promise<TokenBalance[]> {
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
        method: 'ankr_getAccountBalance',
        params: {
          blockchain: chainSlug,
          walletAddress: safeAddress,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting account balances:', data.error);
      return [];
    }

    const assets = data.result?.assets || [];

    // Convert ANKR assets to TokenBalance format
    return assets.map((asset: any) => {
      const isNative = !asset.contractAddress || asset.contractAddress === NATIVE_ASSET;

      return {
        tokenAddress: isNative ? NATIVE_ASSET : asset.contractAddress,
        balance: asset.balance,
        token: {
          symbol: asset.tokenSymbol,
          decimals: asset.tokenDecimals,
          name: asset.tokenName,
          logo: asset.thumbnail || "",
        },
        formattedBalance: asset.balance,
        price: {
          value: asset.balanceUsd / parseFloat(asset.balance),
          diff_24h: 0, // ANKR doesn't provide 24h difference directly
        },
        value: asset.balanceUsd,
        tokenId: isNative ? undefined : asset.contractAddress,
      };
    });
  } catch (error) {
    console.error('Error in getSafeBalances:', error);
    return [];
  }
}

/**
 * Get token details using ANKR API
 *
 * @param chainId The chain ID
 * @param tokenAddress The token address
 * @returns Token details or null if not found
 */
export async function getTokenDetails(
  chainId: number,
  tokenAddressOrSymbol: string,
  tokenMap?: any
): Promise<{ address: string; symbol: string; decimals: number } | null> {
  // First try to get from token map if provided
  if (tokenMap && tokenMap[chainId] && isAddress(tokenAddressOrSymbol)) {
    const token = tokenMap[chainId][tokenAddressOrSymbol.toLowerCase()];
    if (token) {
      return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
      };
    }
  }

  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
    if (!chainSlug) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // If it's not an address, try to find by symbol
    if (!isAddress(tokenAddressOrSymbol)) {
      const response = await fetch(ANKR_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'ankr_findToken',
          params: {
            blockchain: chainSlug,
            query: tokenAddressOrSymbol,
          },
        }),
      });

      const data = await response.json();

      if (data.error || !data.result?.tokens?.length) {
        return null;
      }

      const token = data.result.tokens[0];
      return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
      };
    }

    // If it's an address, get metadata
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
          contractAddress: tokenAddressOrSymbol,
        },
      }),
    });

    const data = await response.json();

    if (data.error || !data.result) {
      return null;
    }

    return {
      address: data.result.address,
      symbol: data.result.symbol,
      decimals: data.result.decimals,
    };
  } catch (error) {
    console.error('Error in getTokenDetails:', error);
    return null;
  }
}

// Helper function to check if a string is an address
function isAddress(value: string): boolean {
  try {
    return value.startsWith('0x') && value.length === 42;
  } catch {
    return false;
  }
}