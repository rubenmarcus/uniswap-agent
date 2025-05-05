import { Address } from "viem";
import { ANKR_API_ENDPOINT, CHAIN_SLUGS } from "../../config";

/**
 * Interface for account balance asset
 */
export interface AccountAsset {
  blockchain: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: number;
  tokenType: string;
  contractAddress: string;
  balance: string;
  balanceRawInteger: string;
  balanceUsd: number;
  thumbnail?: string;
}

/**
 * Get account balances from ANKR API
 */
export async function getAccountBalances(
  address: Address,
  chainId?: number
): Promise<AccountAsset[]> {
  try {
    const params: any = {
      walletAddress: address,
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
        method: 'ankr_getAccountBalance',
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting account balances:', data.error);
      return [];
    }

    return data.result?.assets || [];
  } catch (error) {
    console.error('Error in getAccountBalances:', error);
    return [];
  }
}

/**
 * Get NFTs for an account from ANKR API
 */
export async function getAccountNFTs(
  address: Address,
  chainId?: number
): Promise<any[]> {
  try {
    const params: any = {
      walletAddress: address,
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
        method: 'ankr_getNFTsByOwner',
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting account NFTs:', data.error);
      return [];
    }

    return data.result?.assets || [];
  } catch (error) {
    console.error('Error in getAccountNFTs:', error);
    return [];
  }
}

/**
 * Get transaction history for an account
 */
export async function getAccountTransactions(
  address: Address,
  chainId?: number,
  fromBlock?: number,
  toBlock?: number,
  fromTimestamp?: number,
  toTimestamp?: number
): Promise<any[]> {
  try {
    const params: any = {
      address,
    };

    if (chainId) {
      const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
      if (chainSlug) {
        params.blockchain = chainSlug;
      }
    }

    if (fromBlock !== undefined) params.fromBlock = fromBlock;
    if (toBlock !== undefined) params.toBlock = toBlock;
    if (fromTimestamp !== undefined) params.fromTimestamp = fromTimestamp;
    if (toTimestamp !== undefined) params.toTimestamp = toTimestamp;

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_getTransactionHistory',
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting account transactions:', data.error);
      return [];
    }

    return data.result?.transactions || [];
  } catch (error) {
    console.error('Error in getAccountTransactions:', error);
    return [];
  }
}

/**
 * Get logs for an account
 */
export async function getAccountLogs(
  address: Address,
  chainId: number,
  fromBlock?: number,
  toBlock?: number
): Promise<any[]> {
  try {
    const chainSlug = CHAIN_SLUGS[chainId as keyof typeof CHAIN_SLUGS];
    if (!chainSlug) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const params: any = {
      blockchain: chainSlug,
      address,
    };

    if (fromBlock !== undefined) params.fromBlock = fromBlock;
    if (toBlock !== undefined) params.toBlock = toBlock;

    const response = await fetch(ANKR_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'ankr_getLogs',
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('Error getting account logs:', data.error);
      return [];
    }

    return data.result || [];
  } catch (error) {
    console.error('Error in getAccountLogs:', error);
    return [];
  }
}