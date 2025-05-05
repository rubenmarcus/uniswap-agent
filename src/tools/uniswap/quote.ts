import { Address, createPublicClient, http, defineChain } from "viem";
import { ANKR_API_ENDPOINT, CHAIN_IDS, CHAIN_SLUGS } from "../../config";

// Interface for token information
export interface Token {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  name: string;
}

// Interface for quote result
export interface QuoteResult {
  quote: string;
  quoteDecimals: number;
  estimatedGas: bigint;
  route: string[];
  priceImpact?: string;
}

// Define custom chain configurations for viem
const customChains = {
  ethereum: defineChain({
    id: CHAIN_IDS.ETHEREUM,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [ANKR_API_ENDPOINT] },
    },
  }),
  polygon: defineChain({
    id: CHAIN_IDS.POLYGON,
    name: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: {
      default: { http: [ANKR_API_ENDPOINT] },
    },
  }),
  bsc: defineChain({
    id: CHAIN_IDS.BSC,
    name: 'BNB Chain',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    rpcUrls: {
      default: { http: [ANKR_API_ENDPOINT] },
    },
  }),
  base: defineChain({
    id: CHAIN_IDS.BASE,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [ANKR_API_ENDPOINT] },
    },
  }),
  arbitrum: defineChain({
    id: CHAIN_IDS.ARBITRUM,
    name: 'Arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [ANKR_API_ENDPOINT] },
    },
  }),
  optimism: defineChain({
    id: CHAIN_IDS.OPTIMISM,
    name: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [ANKR_API_ENDPOINT] },
    },
  }),
  avalanche: defineChain({
    id: CHAIN_IDS.AVALANCHE,
    name: 'Avalanche',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: {
      default: { http: [ANKR_API_ENDPOINT] },
    },
  }),
};

/**
 * Get a public client for a specific chain
 */
export function getClient(chainId: number) {
  const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
  if (!chainSlug) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const chain = customChains[chainSlug as keyof typeof customChains];

  return createPublicClient({
    transport: http(ANKR_API_ENDPOINT),
    chain,
  });
}

/**
 * Get a quote for swapping tokens using ANKR API
 */
export async function getQuote(
  chainId: number,
  amountIn: bigint,
  inToken: Token,
  outToken: Token,
  from: Address,
): Promise<QuoteResult | null> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];

    // Make RPC call to ANKR API
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
          contractAddress: outToken.address,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting token price:', data.error);
      return null;
    }

    // Calculate quote based on token prices
    const inTokenPriceResponse = await fetch(ANKR_API_ENDPOINT, {
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
          contractAddress: inToken.address,
        },
      }),
    });

    const inTokenData = await inTokenPriceResponse.json();

    if (inTokenData.error) {
      console.error('Error getting input token price:', inTokenData.error);
      return null;
    }

    // Calculate the quote based on the price ratio
    const inTokenUsdPrice = inTokenData.result?.usdPrice || 0;
    const outTokenUsdPrice = data.result?.usdPrice || 0;

    if (!inTokenUsdPrice || !outTokenUsdPrice) {
      return null;
    }

    const inTokenAmountInUsd = (Number(amountIn) / Math.pow(10, inToken.decimals)) * inTokenUsdPrice;
    const outTokenAmount = inTokenAmountInUsd / outTokenUsdPrice;
    const outTokenAmountRaw = BigInt(Math.floor(outTokenAmount * Math.pow(10, outToken.decimals)));

    return {
      quote: outTokenAmountRaw.toString(),
      quoteDecimals: outToken.decimals,
      estimatedGas: BigInt(150000), // Default estimate
      route: [inToken.address, outToken.address],
      priceImpact: "0.5", // Default estimate
    };
  } catch (error) {
    console.error('Error in getQuote:', error);
    return null;
  }
}

/**
 * Get token balances for an address using ANKR API
 */
export async function getTokenBalances(
  address: Address,
  chainId: number,
): Promise<any[]> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];

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
          walletAddress: address,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting token balances:', data.error);
      return [];
    }

    return data.result?.assets || [];
  } catch (error) {
    console.error('Error in getTokenBalances:', error);
    return [];
  }
}

/**
 * Get token transfers for an address using ANKR API
 */
export async function getTokenTransfers(
  address: Address,
  chainId: number,
  fromTimestamp?: number,
  toTimestamp?: number,
): Promise<any[]> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];

    const params: any = {
      address,
      blockchain: chainSlug,
    };

    if (fromTimestamp) params.fromTimestamp = fromTimestamp;
    if (toTimestamp) params.toTimestamp = toTimestamp;

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_getTokenTransfers',
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting token transfers:', data.error);
      return [];
    }

    return data.result?.transfers || [];
  } catch (error) {
    console.error('Error in getTokenTransfers:', error);
    return [];
  }
}

/**
 * Get token holders count using ANKR API
 */
export async function getTokenHoldersCount(
  contractAddress: string,
  chainId: number,
): Promise<any> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_getTokenHoldersCount',
        params: {
          blockchain: chainSlug,
          contractAddress,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting token holders count:', data.error);
      return null;
    }

    return data.result || null;
  } catch (error) {
    console.error('Error in getTokenHoldersCount:', error);
    return null;
  }
}
